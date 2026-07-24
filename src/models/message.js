const mongoose = require("mongoose");

const sharedPostSchema = new mongoose.Schema(
    {
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "posts",
        },
        caption: { type: String },
        media: {
            url: { type: String },
            mediaType: {
                type: String,
                enum: ["image", "video", "gif"],
            },
        },
    },
    { _id: false },
);

const MessageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: String,
            required: true,
            ref: "Conversation",
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "users",
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "users",
        },
        message: {
            type: String,
            default: "",
        },
        attachment: {
            url: { type: String },
            type: {
                type: String,
                enum: ["image", "file", "audio"],
            },
            name: { type: String },
            size: { type: Number },
        },
        sharedPost: {
            type: sharedPostSchema,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "messages",
        timestamps: true,
    }
);

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
