module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[cm]?js$": "<rootDir>/jest-esbuild-transformer.cjs",
  },
  transformIgnorePatterns: [],
};
