let $ = require("jquery");
const MAX_RECORD_CMD = 300;
const newConsole = (tagName, maxRecord = MAX_RECORD_CMD) => (log) => {
    var resultArea = $(tagName);
    resultArea.append(`<div>[${new Date().toLocaleString()}] ${log}</div>`);
    if (resultArea.children().length > maxRecord) {
        resultArea.children().first().remove();
    }
    if (resultArea.children().length % 5) {
        $("html, body").animate({ scrollTop: $(document).height() }, "fast");
    }
}

module.exports = { newConsole }