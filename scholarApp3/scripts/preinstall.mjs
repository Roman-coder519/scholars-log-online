import fs from "node:fs";

const userAgent = process.env.npm_config_user_agent ?? "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("This workspace uses pnpm. Run `corepack enable` and then `pnpm install`.");
  process.exit(1);
}

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.rmSync(lockfile, { force: true });
  } catch (error) {
    console.warn(`Could not remove ${lockfile}:`, error.message);
  }
}