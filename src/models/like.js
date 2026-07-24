const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
            index: true,
        },
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "likes"
    }
);

LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model("likes", LikeSchema);