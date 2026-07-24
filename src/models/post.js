const mongoose = require("mongoose");

const mediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    mediaType: {
      type: String,
      enum: ["image", "video", "gif"],
      required: true,
    },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    media: { type: [mediaItemSchema], default: [] },
    title: { type: String },
    caption: { type: String, trim: true, default: "" },
    tags: { type: [String] },

    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },

    visibility: {
      type: String,
      enum: ["public", "followers", "private", "exclusive"],
      default: "public",
    },
    // Exclusive content
    isExclusive: { type: Boolean, default: false, index: true },

    // ---- Soft delete fields ----
    // isDeleted: { type: Boolean, default: false, index: true },
    // deletedAt: { type: Date, default: null },

    // ---- Scheduling fields ----
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "failed"],
      default: "published",
      index: true,
    },
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

postSchema.index({ status: 1, scheduledAt: 1 });

// // ---- Query helper: default hidden posts exclude ----
// postSchema.query.notDeleted = function () {
//   return this.where({ isDeleted: false });
// };

// // ---- Instance method: soft delete ----
// postSchema.methods.softDelete = function () {
//   this.isDeleted = true;
//   this.deletedAt = new Date();
//   return this.save();
// };

// // ---- Instance method: restore ----
// postSchema.methods.restore = function () {
//   this.isDeleted = false;
//   this.deletedAt = null;
//   return this.save();
// };

module.exports = mongoose.model("posts", postSchema);
