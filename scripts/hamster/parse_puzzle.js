const puzzle =
  `1, 1, 1, 1, 1, 1, 1, 1,
  1, 3, 4, 5, 5, 0, 6, 1,
  1, 3, 4, 7, 7, 0, 6, 1,
  1, 3, 8, 9, 9, 0, 2, 2,
  1, 10, 8, 0, 0, 0, 11, 1,
  1, 10, 12, 12, 0, 0, 11, 1,
  1, 13, 13, 0, 0, 0, 11, 1,
  1, 1, 1, 1, 1, 1, 1, 1,`

const main = async () => {
  let puzzleStr = puzzle
    .split("\n")
    .map((str) =>
      str
      .replaceAll(" ", "")
        .replaceAll(",", " ")
        .replaceAll("10", "h")
        .replaceAll("11", "i")
        .replaceAll("12", "j")
        .replaceAll("13", "k")
        .replaceAll("14", "l")
        .replaceAll("15", "m")
        .replaceAll("16", "n")
        .replaceAll("17", "o")
        .replaceAll("18", "p")
        .replaceAll("19", "q")
        .replaceAll("20", "r")
        .replaceAll("21", "s")
        .replaceAll("22", "t")
        .replaceAll("23", "u")
        .replaceAll("24", "v")
        .replaceAll("25", "w")
        .replaceAll("26", "x")
        .replaceAll("27", "y")
        .replaceAll("28", "z")
        .replaceAll("0", "-")
        .replaceAll("2", "0")
        .replaceAll("3", "a")
        .replaceAll("4", "b")
        .replaceAll("5", "c")
        .replaceAll("6", "d")
        .replaceAll("7", "e")
        .replaceAll("8", "f")
        .replaceAll("9", "g")
    ).map(str => {
      const strArr = str.trim().split(" ")
      strArr.shift()
      strArr.pop()
      return strArr.join(" ")
    })
  puzzleStr.shift()
  puzzleStr.pop()
  console.log(puzzleStr.join("."))
};

main();
