import { describe, expect, test } from "bun:test";
import { decryptSecret, encryptSecret } from "@/server/vault";
import { runXUse } from "@/server/xuse";

describe("control-plane secret and x-use boundaries", () => {
  test("encrypts and decrypts a secret without exposing the plaintext envelope", () => {
    const previous = process.env.ISPATLA_SECRET_KEY;
    process.env.ISPATLA_SECRET_KEY = "test-vault-key-only";
    try {
      const encrypted = encryptSecret("local-secret-value");
      expect(encrypted).not.toContain("local-secret-value");
      expect(decryptSecret(encrypted)).toBe("local-secret-value");
    } finally {
      if (previous === undefined) delete process.env.ISPATLA_SECRET_KEY;
      else process.env.ISPATLA_SECRET_KEY = previous;
    }
  });

  test("does not claim an unsupported x-use action succeeded", () => {
    const result = runXUse({ action: "reply", text: "test" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("kontratı");
  });
});
