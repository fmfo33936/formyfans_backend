const mongoose = require("mongoose");

const fanPaymentHistorySchema = new mongoose.Schema(
  {
    fanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    fanSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FanSubscription",
      required: true,
    },

    stripeInvoiceId: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },

    amount: { type: Number, default: 0 },
    amountInCents: { type: Number, default: 0 },
    currency: { type: String, default: "usd" },

    status: {
      type: String,
      enum: ["paid", "failed"],
      required: true,
    },

    description: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "fan_payment_history" },
);

module.exports = mongoose.model("FanPaymentHistory", fanPaymentHistorySchema);
