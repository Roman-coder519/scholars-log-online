import fs from "node:fs";
import path from "node:path";

export function loadOptionalEnv() {
  const envPaths = [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;

    const contents = fs.readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    return;
  }
}