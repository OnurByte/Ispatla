import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type XUseAccount = {
  account_id: string;
  is_active: boolean;
  cookie_file_path: string;
  [key: string]: unknown;
};

const DEFAULT_SETTINGS = {
  api_keys: {},
  twitter_automation: { action_config: {} },
  logging: { level: "INFO" },
  browser_settings: { type: "chrome", headless: false },
};

function configPath(name: string): string {
  return join(process.env.XUSE_CWD || process.cwd(), "config", name);
}

function atomicJsonWrite(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, path);
}

export function ensureXUseSettings(): string {
  const path = configPath("settings.json");
  if (!existsSync(path)) atomicJsonWrite(path, DEFAULT_SETTINGS);
  return path;
}

export function syncXUseAccounts(accounts: Array<{ xuseAccountId: string; enabled: boolean }>): string {
  const path = configPath("accounts.json");
  let existing: XUseAccount[] = [];
  if (existsSync(path)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(parsed)) existing = parsed.filter((item): item is XUseAccount => Boolean(item && typeof item === "object" && typeof (item as XUseAccount).account_id === "string"));
    } catch {
      // Replace malformed metadata from the DB source of truth; never copy secrets from it.
    }
  }
  const prior = new Map(existing.map((account) => [account.account_id, account]));
  const next = accounts
    .filter((account) => account.xuseAccountId.trim())
    .map((account) => {
      const accountId = account.xuseAccountId.trim();
      const preserved: Record<string, unknown> = prior.get(accountId) || {};
      const safe = { ...preserved };
      delete safe.cookies;
      delete safe.username;
      delete safe.password;
      return { ...safe, account_id: accountId, is_active: account.enabled, cookie_file_path: `config/${accountId}_cookies.json` };
    });
  atomicJsonWrite(path, next);
  return path;
}

export function xuseConfigStatus() {
  const settings = configPath("settings.json");
  const accounts = configPath("accounts.json");
  return { settings, accounts, settingsExists: existsSync(settings), accountsExists: existsSync(accounts) };
}
