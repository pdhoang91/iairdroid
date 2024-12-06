import { newSemaphore } from "./semaphore.js";

const { worker, exec } = newSemaphore(5);

export default exec;
