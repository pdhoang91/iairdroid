import axios from "axios";
import { JSONStringtify, sleep } from "./helper.js";
import { newSemaphore } from "./semaphore.js";

const CAPSOLVER_API_KEY = "CAP-81D17C915959F5DE84D28C515D4E88BC";
const BANANA_PAGE_URL = "https://banana.carv.io";
const BANANA_WEBSITE_KEY = "0x4AAAAAAAyrBuzHYpH5lZio";
const { exec } = newSemaphore(10);
async function createTask(
  type,
  websiteURL,
  websiteKey,
  metadata_action = null,
  metadata_cdata = null
) {
  const url = "https://api.capsolver.com/createTask";
  const task = {
    type,
    websiteURL,
    websiteKey,
  };
  if (metadata_action || metadata_cdata) {
    task.metadata = {};
    if (metadata_action) {
      task.metadata.action = metadata_action;
    }
    if (metadata_cdata) {
      task.metadata.cdata = metadata_cdata;
    }
  }
  const data = {
    clientKey: CAPSOLVER_API_KEY,
    task: task,
  };
  const response = await axios.post(url, data);
  return response.data.taskId;
}

async function solutionGet(taskId) {
  const url = "https://api.capsolver.com/getTaskResult";
  let status = "";
  while (status !== "ready") {
    const data = { clientKey: CAPSOLVER_API_KEY, taskId: taskId };
    const response = await axios.post(url, data);
    // console.log(response.data);
    status = response.data.status;
    if (status === "ready") {
      return response.data.solution;
    }
    await sleep(2);
  }
}

export const getBananaTurnstileToken = async (secret) =>
  await exec(async () => {
    const taskId = await createTask(
      "AntiTurnstileTaskProxyLess",
      BANANA_PAGE_URL,
      BANANA_WEBSITE_KEY
    );
    secret.log(`Created task ${taskId}`);
    const solution = await solutionGet(taskId);
    if (!solution?.token)
      throw new Error(
        `Received solution wo token: ${JSONStringtify(solution)}`
      );
    return solution.token;
  });
