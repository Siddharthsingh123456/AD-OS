// Local / traditional-host entry point (Vercel uses /api/index.js instead).
try {
  require("dotenv").config({ path: [".env.local", ".env"] });
} catch {
  /* dotenv is optional in production */
}
const path = require("path");
const fs = require("fs");
const express = require("express");
const env = require("./config/env");
const { disconnectDB } = require("./config/db");
const app = require("./app");

const dist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(dist)) {
  // Hashed build assets can be cached forever; index.html must always be revalidated.
  app.use("/assets", express.static(path.join(dist, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(dist, { maxAge: "1h", index: false }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(dist, "index.html")));
}

for (const w of env.warnings()) console.warn("[config] " + w);
// Open the database now (and download the embedded one on first run) so the first page load is not the one that waits.
if (env.mongoUri() || env.embeddedDb())
  require("./config/db")
    .connectDB()
    .catch((e) => console.error("[db] " + e.message));

const server = app.listen(env.port(), () =>
  console.log(`AI Developer OS ${env.version} listening on http://localhost:${env.port()}`),
);

// Finish in-flight requests, then close the database, so deploys and Ctrl+C never cut a stream mid-write.
function shutdown(signal) {
  console.log(`${signal} received: shutting down`);
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
