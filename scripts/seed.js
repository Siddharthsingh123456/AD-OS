#!/usr/bin/env node
// npm run seed : creates or resets the demo account (demo@ai-developer-os.local) with sample data in your MONGODB_URI database.
try {
  require("dotenv").config({ path: [".env.local", ".env"] });
} catch {
  /* dotenv is optional */
}
const { connectDB, disconnectDB } = require("../server/src/config/db");
const { seedDemoUser, DEMO_EMAIL } = require("../server/src/services/seed");

(async () => {
  await connectDB();
  await seedDemoUser();
  console.log(`Seeded ${DEMO_EMAIL}. Set DEMO_MODE=true to show the "Try the demo" button on the sign-in page.`);
  await disconnectDB();
})().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
