import { describe, expect, it } from "vitest";

import { getLocalAuthConfig } from "../../src/env.js";

describe("getLocalAuthConfig", () => {
  describe("sessionSecret in non-production environments", () => {
    it("uses the placeholder fallback when no secret is set", () => {
      const config = getLocalAuthConfig({});
      expect(config.sessionSecret).toBe(
        "casemind-local-session-secret-change-me",
      );
    });

    it("accepts the placeholder value explicitly", () => {
      const config = getLocalAuthConfig({
        CASEMIND_AUTH_SESSION_SECRET:
          "casemind-local-session-secret-change-me",
      });
      expect(config.sessionSecret).toBe(
        "casemind-local-session-secret-change-me",
      );
    });

    it("uses a custom secret when provided", () => {
      const config = getLocalAuthConfig({
        CASEMIND_AUTH_SESSION_SECRET: "my-custom-dev-secret",
      });
      expect(config.sessionSecret).toBe("my-custom-dev-secret");
    });
  });

  describe("sessionSecret in production", () => {
    it("throws when CASEMIND_AUTH_SESSION_SECRET is not set", () => {
      expect(() =>
        getLocalAuthConfig({ NODE_ENV: "production" }),
      ).toThrow(
        "CASEMIND_AUTH_SESSION_SECRET must be explicitly set to a strong secret in production",
      );
    });

    it("throws when CASEMIND_AUTH_SESSION_SECRET is empty", () => {
      expect(() =>
        getLocalAuthConfig({
          NODE_ENV: "production",
          CASEMIND_AUTH_SESSION_SECRET: "",
        }),
      ).toThrow(
        "CASEMIND_AUTH_SESSION_SECRET must be explicitly set to a strong secret in production",
      );
    });

    it("throws when CASEMIND_AUTH_SESSION_SECRET is the placeholder", () => {
      expect(() =>
        getLocalAuthConfig({
          NODE_ENV: "production",
          CASEMIND_AUTH_SESSION_SECRET:
            "casemind-local-session-secret-change-me",
        }),
      ).toThrow(
        "CASEMIND_AUTH_SESSION_SECRET must be explicitly set to a strong secret in production",
      );
    });

    it("accepts a strong secret in production", () => {
      const config = getLocalAuthConfig({
        NODE_ENV: "production",
        CASEMIND_AUTH_SESSION_SECRET: "super-strong-production-secret-32chars!",
      });
      expect(config.sessionSecret).toBe(
        "super-strong-production-secret-32chars!",
      );
    });
  });
});
