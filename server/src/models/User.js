const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // Tokens issued before this moment are rejected, so changing a password signs out every other session.
    passwordChangedAt: Date,
    // Billing (only used when Stripe is configured). Quotas are not tied to the plan yet.
    plan: { type: String, enum: ["starter", "pro", "team"], default: "starter" },
    planStatus: { type: String, default: "" },
    stripeCustomerId: { type: String, default: "", index: true },
    stripeSubscriptionId: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model("User", schema);
