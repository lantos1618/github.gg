-- Atomic installation -> account binding (audit R2).
--
-- Prevents a TOCTOU race in src/app/api/auth/link-installation/route.ts where
-- two concurrent callers could each pass the "is this installation linked"
-- check and then both UPDATE account.installationId to the same value, binding
-- one GitHub App installation to two different accounts.
--
-- Partial unique index: enforces uniqueness only over rows where
-- installationId IS NOT NULL, so multiple accounts can coexist with NULL
-- (which is the common state — most users never install the app).
CREATE UNIQUE INDEX IF NOT EXISTS account_installation_unique_idx
  ON account ("installation_id")
  WHERE "installation_id" IS NOT NULL;
