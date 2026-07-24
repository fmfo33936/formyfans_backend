const mongoose = require("mongoose");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    media: { type: String, trim: true, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + TWENTY_FOUR_HOURS_MS),
    },
  },
  {
    timestamps: true,
    collection: "stories",
  },
);

storySchema.index({ authorId: 1, expiresAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("stories", storySchema);
