// controllers/like.controller.js
const LikeModel = require("../models/like");
const PostModel = require("../models/post");
const { logActivity } = require("../utils/activityLogger");
const { buildAggregatePagination } = require("../utils/helper");
const { createNotification } = require("../utils/notificationHelper");
const { parsePagination } = require("../utils/socialHelpers");
const { likePostSchema } = require("../utils/validations");
const { schemaValidator } = require("../utils/validator");
const mongoose = require("mongoose");

// ── Like ──────────────────────────────────────────────────────────
const likePost = async (req, res) => {
  const [error, validatedData] = schemaValidator(req.body, likePostSchema);
  if (error) return res.status(400).json({ status: "error", message: error });

  try {
    const user = req.user;
    const userId = user._id;
    const { postId } = validatedData;

    const post = await PostModel.exists({ _id: postId });
    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    await LikeModel.create({ userId, postId });

    res.status(201).json({
      status: "success",
      message: "Post liked",
    });

    setImmediate(async () => {
      const tasks = [
        PostModel.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } }),
        logActivity(req, {
          userId,
          action: "post_liked",
          targetType: "posts",
          targetId: postId,
          meta: {
            postId: postId,
            message: "You have liked a post",
          },
        }),
      ];

      const postAuthor = await PostModel.findById(postId).select("authorId");

      if (postAuthor.authorId.toString() !== userId.toString()) {
        tasks.push(
          createNotification({
            recipientId: postAuthor.authorId,
            senderId: userId,
            type: "post_liked",
            targetType: "posts",
            targetId: postId,
            title: "Post liked",
            message: `Your post has been liked by ${user.firstName} ${user.lastName}`,
            meta: {
              postId: postId,
              message: `Your post has been liked by a ${user.firstName} ${user.lastName}`,
              userId: userId,
            },
          }),
        );
      }

      const results = await Promise.allSettled(tasks);

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`Post-like background task #${i} failed:`, r.reason);
        }
      });
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ status: "error", message: "Already liked" });
    }
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ── Unlike ────────────────────────────────────────────────────────
const unlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const result = await LikeModel.deleteOne({ userId, postId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Like not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Post unliked",
    });

    setImmediate(async () => {
      const tasks = [
        PostModel.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } }),
        logActivity(req, {
          userId,
          action: "post_unliked",
          targetType: "posts",
          targetId: postId,
          meta: {
            postId: postId,
            message: "You have unliked a post",
          },
        }),
      ];

      const results = await Promise.allSettled(tasks);

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`Post-unlike background task #${i} failed:`, r.reason);
        }
      });
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// ── Get Post Likes ────────────────────────────────────────────────
const getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page, limit, skip } = parsePagination(req);

    const results = await LikeModel.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                "user._id": 1,
                "user.firstName": 1,
                "user.lastName": 1,
                "user.username": 1,
                "user.image": 1,
                "user.isVerified": 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]);

    const { data, pagination } = buildAggregatePagination(req, results);

    return res.status(200).json({
      status: "success",
      message: "Likes fetched successfully",
      data,
      pagination,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { likePost, unlikePost, getPostLikes };
