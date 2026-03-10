export default {
  mutate: ["packages/auth/src/**/*.ts"],
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  reporters: ["clear-text", "html"],
  coverageAnalysis: "perTest",
  ignoreStatic: true,
  tempDirName: ".stryker-tmp",
  vitest: {
    configFile: "packages/auth/vitest.config.ts",
  },
};
