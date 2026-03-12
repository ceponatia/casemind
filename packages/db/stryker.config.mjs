export default {
  mutate: ["src/**/*.ts", "!src/scripts/**/*.ts"],
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  reporters: ["clear-text", "html"],
  coverageAnalysis: "perTest",
  ignoreStatic: true,
  tempDirName: ".stryker-tmp",
  vitest: {
    configFile: "vitest.config.ts",
  },
};
