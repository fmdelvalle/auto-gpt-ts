module.exports = {
    roots: ["<rootDir>/src/tests"],
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    transform: {
      "^.+\\.tsx?$": "ts-jest"
    },
  };