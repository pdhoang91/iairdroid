import os from "os";

export const getCpuCores = () => os.cpus().length;

export const getSeleniumThreads = () => {
  const cpuCore = getCpuCores();
  return Math.round(cpuCore / 3);
};
