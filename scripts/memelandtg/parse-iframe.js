import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";

const main = async () => {
    const data = loadFile("config/iframememelandtg.private.txt").toString("utf8")
    const rows = data.split("\n").filter(str => str).map((str) => {
        let [name, link] = str.split("|")
        let rawTgWebAppData = link, parts = [];
        if (link.startsWith("https://memeverse.site")) {
            rawTgWebAppData = decodeURIComponent(rawTgWebAppData.split("#")[1].split("=")[1])
            for (const part of rawTgWebAppData.split("&")) {
                try {
                    if (part.startsWith("hash")) break
                } finally {
                    parts.push(part)
                }
            }
            rawTgWebAppData = parts.join("&");
        }
        if (!name) {
            const { id } = parseTgUserFromInitParams(rawTgWebAppData)
            name = id;
        }
        return name + "," + btoa(rawTgWebAppData.trim()) + ",,,,,"
    }).filter(str => str)
    const output = ["Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy", ...rows].join("\n");
    writeFile("config/output-memelandtg.private.csv", output);
}

main();