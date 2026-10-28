import { spawn } from "node:child_process";
import process from "node:process";
import { loadOptionalEnv } from "./env.mjs";

loadOptionalEnv();
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const build = spawn(packageManager, ["run", "build"], {
  stdio: "inherit",
  env: process.env,
});

build.on("error", (error) => {
  console.error("Could not start pnpm:", error);
  process.exit(1);
});

build.on("exit", (code, signal) => {
  if (code !== 0 || signal) {
    process.exit(code ?? 1);
  }

  const server = spawn(
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    { stdio: "inherit", env: process.env },
  );

  server.on("error", (error) => {
    console.error("Could not start the API server:", error);
    process.exit(1);
  });

  server.on("exit", (serverCode, serverSignal) => {
    process.exit(serverCode ?? (serverSignal ? 1 : 0));
  });
});