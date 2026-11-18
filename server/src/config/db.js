const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const env = require("./env");

// Cached on `global` so warm serverless invocations reuse one connection instead of opening a new one per request.
const cache = global._aidosMongo || (global._aidosMongo = { conn: null, promise: null, mem: null });

/** Local development without Atlas: start (or reuse) a MongoDB that keeps its files in .data/mongo. */
async function embeddedUri() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require("mongodb-memory-server"));
  } catch {
    throw new Error(
      "MONGODB_URI is not set and the embedded database is missing. Run `npm install`, or set MONGODB_URI.",
    );
  }
  const dbPath = path.join(env.dataDir(), "mongo");
  fs.mkdirSync(dbPath, { recursive: true });
  if (!cache.mem) {
    console.log("[db] Starting embedded MongoDB (the first run downloads the server binary, this can take a minute)…");
    cache.mem = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
    console.log("[db] Embedded MongoDB ready. Data is kept in " + dbPath);
  }
  return cache.mem.getUri("ai-developer-os");
}

async function connectDB() {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = (async () => {
      const uri = env.mongoUri() || (env.embeddedDb() ? await embeddedUri() : "");
      if (!uri) throw new Error("MONGODB_URI is not set");
      mongoose.set("strictQuery", true);
      return mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 });
    })();
  }
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    cache.conn = null;
    throw e;
  }
  return cache.conn;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (cache.mem) {
    await cache.mem.stop().catch(() => {});
    cache.mem = null;
  }
  cache.conn = null;
  cache.promise = null;
}

module.exports = { connectDB, disconnectDB };
