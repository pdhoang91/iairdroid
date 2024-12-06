import { parseTgUserFromInitParams } from "../../utils/helper.js";
import { loadFile, writeFile } from "../../utils/loader.js";

const main = async () => {
    const data = loadFile("config/iframeocean.private.txt").toString("utf8")
    const rows = data.split("\n").filter(str => str).map((str) => {
        let [name, link] = str.split("|")
        let rawTgWebAppData = link, parts = [];
        if (link.startsWith("https://walletapp.waveonsui.com")) {
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
        return btoa(rawTgWebAppData.trim())
    }).filter(str => str)
    const output = rows.join("\n");
    writeFile("config/ocean-initparams.private.txt", output);
}

main();