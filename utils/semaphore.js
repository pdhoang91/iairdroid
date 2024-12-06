import semaphore from "semaphore";

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
  return { worker, exec, execAndNotLeave };
};

export const newSemaphoreMap = (capacity = 1) => {
  const execMap = {};
  const execByFn = (key) => {
    if (!(key in execMap)) {
      execMap[key] = newSemaphore(capacity).exec;
    }
    return execMap[key];
  }
  return {
    execBy: (key, fn = async () => {}) => {
      return execByFn(key)(fn);
    },
    execByFn,
  };
}

export const threadSafeMap = (execBy) => {
  const map = {}
  if (!execBy) {
    execBy = newSemaphoreMap().execBy;
  }

  const getOrSetIfEmpty = async(key, val = async() => {}, after = async(val) => {}, onCreated = async(val) => {}) => {
    return await execBy(key, async() => {
      if (!(key in map)) {
        map[key] = await val();
        await onCreated();
      }
      const result = map[key];
      await after(result);
      return result;
    })
  }
  const deleteVal = async(key, beforeDelete = async() => {}) => {
    await execBy(key, async() => {
      if (!(key in map)) return
      await beforeDelete(map[key]);
      delete map[key];
    })
  }
  return {
    getOrSetIfEmpty,
    deleteVal,
  }
}