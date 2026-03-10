import { describe, expect, it, vi } from "vitest";

import { createCredentialsProvider } from "../../src/index.js";

describe("credentials provider", () => {
  it("delegates authorization to the auth service", async () => {
    const login = vi.fn().mockResolvedValue({ status: "invalid_credentials" });
    const provider = createCredentialsProvider({ login } as never);

    const result = await provider.authorize({
      email: "apa@local.casemind.test",
      password: "wrong-password",
    });

    expect(login).toHaveBeenCalledOnce();
    expect(result.status).toBe("invalid_credentials");
  });
});
