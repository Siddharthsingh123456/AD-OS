// Test helpers: boot the Express app on an ephemeral port, with the database layer stubbed as "connected".
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
delete process.env.MONGODB_URI;

const mongoose = require("mongoose");
// No real connection exists in tests, so Mongoose must not try to build indexes or create collections.
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);
// Models must compile while the connection still reports "disconnected"; only then is it stubbed as connected.
require("../src/models");
global._aidosMongo = { conn: {}, promise: null };
Object.defineProperty(mongoose.connection, "readyState", { get: () => 1, configurable: true });

const http = require("http");

async function start() {
  const app = require("../src/app");
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

const json = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

module.exports = { start, json };
