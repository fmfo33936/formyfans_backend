const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "posts",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model("comments", commentSchema);
