import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decryptSecret, encryptSecret } from "@/server/vault";
import { runXUse, xuseEnvironment } from "@/server/xuse";
import { ensureXUseSettings, syncXUseAccounts } from "@/server/xuse-config";

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

  test("passes only x-use runtime variables to its child process", () => {
    expect(xuseEnvironment({
      HOME: "/tmp/user",
      PATH: "/usr/bin",
      LANG: "tr_TR.UTF-8",
      HTTPS_PROXY: "http://proxy.example",
      XUSE_CWD: "/tmp/x-use",
      ISPATLA_SECRET_KEY: "vault-secret",
      ISPATLA_ADMIN_TOKEN: "admin-secret",
      OPENAI_API_KEY: "api-secret",
    })).toEqual({
      HOME: "/tmp/user",
      PATH: "/usr/bin",
      LANG: "tr_TR.UTF-8",
      HTTPS_PROXY: "http://proxy.example",
      XUSE_CWD: "/tmp/x-use",
    });
  });

  test("bootstraps x-use config without copying account secrets", () => {
    const directory = mkdtempSync(join(tmpdir(), "ispatla-xuse-config-"));
    const previous = process.env.XUSE_CWD;
    process.env.XUSE_CWD = directory;
    try {
      expect(ensureXUseSettings()).toBe(join(directory, "config", "settings.json"));
      writeFileSync(join(directory, "config", "accounts.json"), JSON.stringify([{
        account_id: "main",
        cookies: [{ name: "auth_token", value: "secret" }],
        action_config: { enable_liking_tweets: false },
      }]));
      syncXUseAccounts([{ xuseAccountId: "main", enabled: true }]);
      const account = JSON.parse(readFileSync(join(directory, "config", "accounts.json"), "utf8"))[0];
      expect(account).toMatchObject({ account_id: "main", is_active: true, cookie_file_path: "config/main_cookies.json", action_config: { enable_liking_tweets: false } });
      expect(account.cookies).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.XUSE_CWD;
      else process.env.XUSE_CWD = previous;
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
