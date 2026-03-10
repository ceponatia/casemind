export default {
  mutate: ["packages/platform-config/src/**/*.ts"],
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  reporters: ["clear-text", "html"],
  coverageAnalysis: "off",
  tempDirName: ".stryker-tmp",
  vitest: {
    configFile: "packages/platform-config/vitest.config.ts",
  },
};
