import { loadOptionalEnv } from "./env.mjs";

loadOptionalEnv();
await import("./dist/index.mjs");