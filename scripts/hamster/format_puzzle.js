const puzzle =
  "- a - - c -.- a b b c -.0 0 e - c -.f - e d d v.f g g x - v.f h h x z z";

const main = async () => {
  let puzzleStr = puzzle
    .split(".")
    .map((str) =>
      str
        .replaceAll(" ", ",")
        .replaceAll("0", "2")
        .replaceAll("-", "0")
        .replaceAll("a", "3")
        .replaceAll("b", "4")
        .replaceAll("c", "5")
        .replaceAll("d", "6")
        .replaceAll("e", "7")
        .replaceAll("f", "8")
        .replaceAll("g", "9")
        .replaceAll("h", "10")
        .replaceAll("i", "11")
        .replaceAll("j", "12")
        .replaceAll("k", "13")
        .replaceAll("l", "14")
        .replaceAll("m", "15")
        .replaceAll("n", "16")
        .replaceAll("o", "17")
        .replaceAll("p", "18")
        .replaceAll("q", "19")
        .replaceAll("r", "20")
        .replaceAll("s", "21")
        .replaceAll("t", "22")
        .replaceAll("u", "23")
        .replaceAll("v", "24")
        .replaceAll("w", "25")
        .replaceAll("x", "26")
        .replaceAll("y", "27")
        .replaceAll("z", "28")
    )
    .map((str) => {
      str = "1," + str + "," + (str.includes("2,2") ? "-1" : "1") + ",";
      return str;
    });
  const width = puzzleStr[0].split(",").length - 1;
  const height = puzzleStr.length + 2;
  let border = "";
  for (let i = 0; i < width; i++) {
    border += "1,";
  }
  console.log(`${width},${height},`);
  puzzleStr = [border, ...puzzleStr, border];
  puzzleStr.forEach((str) => console.log(str));
};

main();
