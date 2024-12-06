import fs from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

export const loadFile = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const finalFilePath = path.resolve(path.dirname(__filename), "..", filePath);
  const fileData = fs.readFileSync(finalFilePath);
  return fileData;
};

export const loadFileAsStream = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const finalFilePath = path.resolve(path.dirname(__filename), "..", filePath);
  const stream = fs.createReadStream(finalFilePath);
  return stream;
};

export const writeFile = (filePath, data) => {
  const __filename = fileURLToPath(import.meta.url);
  const finalFilePath = path.resolve(path.dirname(__filename), "..", filePath);
  fs.writeFileSync(finalFilePath, data, { flag: "w+" });
};

export const downloadFile = async (url, fileName) => {
  const res = await fetch(url);
  const folder = dirname(fileName)
  if (!fs.existsSync(folder)) {
    console.log(`Tạo folder ${folder}`);
    fs.mkdirSync(folder, {recursive: true});
  }
  const fileStream = fs.createWriteStream(fileName, { flags: 'wx' });
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
};