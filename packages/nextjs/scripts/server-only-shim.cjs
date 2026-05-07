// Preload shim that makes `import "server-only"` a no-op when running
// scripts (tsx, node) outside a Next.js server context. Used by the
// DynamoDB smoke test in this folder.
//
// Usage:
//   NODE_OPTIONS='--require ./packages/nextjs/scripts/server-only-shim.cjs' \
//     npx tsx packages/nextjs/scripts/smoke-runs-db.ts
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
