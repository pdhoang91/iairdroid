import { getItemObj, setItem } from "../config/network.js";
import { JSONStringtify } from "./helper.js";
const DICT_EXPIRE_TIME = 10 * 365 * 24 * 60 * 60_000;
const seedphraseDictionaryKey = (project) => `seedphrase-dictionary.${project}`;

export const loadBirdsDictionary = () => loadDictionary("birds");
export const loadBananaDictionary = () => loadDictionary("banana");
export const loadLostdogsDictionary = () => loadDictionary("lostdogs");
export const loadPawsDictionary = () => loadDictionary("paws");
export const loadOceanMemepadDictionary = () => loadDictionary("ocean-memepad");
export const loadYescoinDictionary = () => loadDictionary("yescoin");
export const loadHamsterDictionary = () => loadDictionary("hamster");
export const loadTomarketDictionary = () => loadDictionary("tomarket");

const loadDictionary = (project) => {
  const cacheKey = seedphraseDictionaryKey(project);
  let dict = getItemObj(cacheKey);
  if (!dict) {
    dict = {};
  }
  let changes = 0;
  console.log(
    `Found ${project} dictionary with ${Object.keys(dict).length} entries`
  );
  return {
    print: () => console.log(JSONStringtify(dict)),
    get: (userId) => dict[userId],
    getOrEmpty: (userId) => dict[userId] || "",
    set: (userId, seedphrase) => {
      if (dict[userId] != seedphrase) {
        dict[userId] = seedphrase;
        changes++;
      }
    },
    save: () => {
      console.log(
        `Save ${project} dictionary with ${
          Object.keys(dict).length
        } entries (${changes} changes)`
      );
      setItem(cacheKey, dict, DICT_EXPIRE_TIME);
      changes = 0;
    },
  };
};
