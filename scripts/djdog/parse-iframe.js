import { loadFile, writeFile } from "../../utils/loader.js";

const main = async () => {
    const data = loadFile("config/iframedjdog.private.txt").toString("utf8")
    const rows = data.split("\n").filter(str => str).map((str) => {
        const [name, link] = str.split("|")
        if (!link) return
        const rawData = link.replaceAll("https://djdog.io/#", "");
        const [
            tgWebAppData,
        ] = rawData.split("&");
        const [_, rawTgWebAppData] = tgWebAppData.split("tgWebAppData=");
        return name + "," + btoa(decodeURIComponent(rawTgWebAppData).trim()) + ",,24/5/2025,20,0,"
    }).filter(str => str)
    const output = ["Tên,Private Key / Seedphase,Địa chỉ nhận tiền,Ngày bắt đầu thu,Thời gian bắt đầu thu,Hoa hồng (20%),Proxy", ...rows].join("\n");
    writeFile("config/output-djdog.private.csv", output);
}

main();