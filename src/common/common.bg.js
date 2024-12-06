import { newSemaphore } from "../../utils/semaphore.js";

export const { exec: suiExec } = newSemaphore(2);