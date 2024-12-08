import semaphore from "semaphore";
import EventEmitter from "node:events";

export const newSemaphore = (capacity = 1) => {
  const worker = semaphore(capacity);
  const exec = (fn = async () => {}, count = 1) =>
    new Promise(async (resolve, reject) =>
      worker.take(count, async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          worker.leave(count);
        }
      })
    );
  const execAndNotLeave = (fn = async () => {}) =>
    new Promise(async (resolve, reject) =>
      worker.take(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      })
    );
  const execAllAfter = async (fns = []) => {
    const promises = fns.map((fn) => {
      const src = new EventEmitter();
      return {
        fn: (...agrs) => {
          src.emit("do", ...agrs);
          return new Promise((resolve, reject) =>
            src
              .on("done", (rs) => resolve(rs))
              .on("error", (err) => reject(err))
          );
        },
        promise: () =>
          new Promise((resolve, reject) =>
            src.on("do", (...agrs) =>
              fn(...agrs)
                .then((val) => {
                  src.emit("done", val);
                  resolve()
                })
                .catch((e) => {
                  src.emit("error", e);
                  reject(e);
                })
            )
          ),
      };
    });
    return {
      functions: promises.map(({ fn }) => fn),
      done: () =>
        exec(() => Promise.all(promises.map(({ promise }) => promise()))),
    };
  };
  return { worker, exec, execAndNotLeave, execAllAfter };
};

export const newSemaphoreMap = (capacity = 1) => {
  const execMap = {};
  const execByFn = (key) => {
    if (!(key in execMap)) {
      execMap[key] = newSemaphore(capacity).exec;
    }
    return execMap[key];
  };
  return {
    execBy: (key, fn = async () => {}) => {
      return execByFn(key)(fn);
    },
    execByFn,
  };
};

export const threadSafeMap = (execBy) => {
  const map = {};
  if (!execBy) {
    execBy = newSemaphoreMap().execBy;
  }

  const getOrSetIfEmpty = async (
    key,
    val = async () => {},
    after = async (val) => {},
    onCreated = async (val) => {}
  ) => {
    return await execBy(key, async () => {
      if (!(key in map)) {
        map[key] = await val();
        await onCreated(map[key]);
      }
      const result = map[key];
      await after(result);
      return result;
    });
  };
  const deleteVal = async (key, beforeDelete = async () => {}) => {
    if (!(key in map)) return;
    await execBy(key, async () => {
      await beforeDelete(map[key]);
      delete map[key];
    });
  };
  const isExist = (key) => key in map;
  return {
    getOrSetIfEmpty,
    deleteVal,
    isExist,
  };
};
