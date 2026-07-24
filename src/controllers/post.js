const Post = require("../models/post");
const Comment = require("../models/comment");
const User = require("../models/auth");
const {
  AUTHOR_FIELDS,
  parsePagination,
  assertOwner,
  sanitizeAuthor,
  isLikedByUser,
} = require("../utils/socialHelpers");
const mongoose = require("mongoose");
const { logActivity } = require("../utils/activityLogger");
const { buildAggregatePagination } = require("../utils/helper");
const { createPostSchema, updatePostSchema } = require("../utils/validations");
const { schemaValidator } = require("../utils/validator");

const formatPost = async (post, viewerId) => {
  if (!post) return null;

  await post.populate("authorId", AUTHOR_FIELDS);

  const doc = post.toObject ? post.toObject() : { ...post };
  const isLiked = await isLikedByUser(doc._id, viewerId);

  return {
    _id: doc._id,
    authorId: doc.authorId?._id ? sanitizeAuthor(doc.authorId) : doc.authorId,
    author: doc.authorId?._id ? sanitizeAuthor(doc.authorId) : null,
    caption: doc.caption ?? "",
    media: doc.media ?? [],
    likesCount: doc.likesCount ?? 0,
    commentsCount: doc.commentsCount ?? 0,
    sharesCount: doc.sharesCount ?? 0,
    visibility: doc.visibility,
    isLiked,
    isExclusive: doc.isExclusive,
    status: doc.status,
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const createPost = async (req, res) => {
  const [error, validatedData] = schemaValidator(req.body, createPostSchema);
  if (error) return res.status(400).json({ status: "error", message: error });

  try {
    const userId = req.user._id;
    const { scheduledAt, ...restData } = validatedData;

    let status = "published";
    let publishedAt = new Date();

    if (scheduledAt) {
      status = "scheduled";
      publishedAt = null;
    }

    const post = await Post.create({
      authorId: userId,
      ...restData,
      status,
      scheduledAt: scheduledAt || null,
      publishedAt,
    });

    const formattedPost = await formatPost(post, userId);

    res.status(200).json({
      status: "success",
      message:
        status === "scheduled"
          ? "Post scheduled successfully"
          : "Post created successfully",
      post: formattedPost,
    });

    setImmediate(async () => {
      await logActivity(req, {
        userId,
        action: status === "scheduled" ? "post_scheduled" : "post_created",
        targetType: "posts",
        targetId: post._id,
        meta: {
          message:
            status === "scheduled"
              ? "Post scheduled successfully"
              : "Post created successfully",
        },
      });
    });
  } catch (error) {
    console.error("Create post error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const updatePost = async (req, res) => {
  const [error, validatedData] = schemaValidator(req.body, updatePostSchema);
  if (error) return res.status(400).json({ status: "error", message: error });

  try {
    const userId = req.user._id;
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const ownershipError = assertOwner(post.authorId, userId);
    if (ownershipError) {
      return res.status(403).json({
        status: "error",
        message: ownershipError,
      });
    }

    // Don't allow editing a post that's already published
    if (post.status === "published" && validatedData.scheduledAt) {
      return res.status(400).json({
        status: "error",
        message: "Cannot reschedule a post that's already published",
      });
    }

    const updatePayload = { ...validatedData };

    // If updating scheduledAt on a not-yet-published post, keep status in sync
    if (validatedData.scheduledAt) {
      updatePayload.status = "scheduled";
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updatePayload, {
      new: true,
      runValidators: true,
    });

    const formattedPost = await formatPost(updatedPost, userId);

    res.status(200).json({
      status: "success",
      message: "Post updated successfully",
      post: formattedPost,
    });

    setImmediate(async () => {
      await logActivity(req, {
        userId,
        action: "post_updated",
        targetType: "posts",
        targetId: post._id,
        meta: {
          message: "Post updated successfully",
        },
      });
    });
  } catch (error) {
    console.error("Update post error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const ownershipError = assertOwner(post.authorId, userId);
    if (ownershipError) {
      return res.status(403).json({
        status: "error",
        message: ownershipError,
      });
    }

    await Comment.deleteMany({ postId: post._id });
    await Post.deleteOne({ _id: post._id });

    res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
    });
    setImmediate(async () => {
      await logActivity(req, {
        userId,
        action: "post_deleted",
        targetType: "posts",
        targetId: post._id,
        meta: {
          message: "Post deleted successfully",
        },
      });
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getUserPostsByUsername = async (req, res) => {
  const { username } = req.params;
  const { status = "published" } = req.query;

  const { page, limit, skip } = parsePagination(req);

  try {
    // verify user
    const viewerId = req.user?._id || null;
    const viewerObjectId = viewerId
      ? new mongoose.Types.ObjectId(viewerId)
      : null;

    const user = await User.findOne({ username }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const filter = {
      isExclusive: false,
      authorId: new mongoose.Types.ObjectId(user._id),
    };

    if (status) {
      filter.status = status;
    }

    const results = await Post.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                username: 1,
                image: 1,
                role: 1,
              },
            },
          ],
          as: "author",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", viewerObjectId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "likeData",
        },
      },
      {
        $addFields: {
          isLiked: viewerObjectId
            ? { $gt: [{ $size: "$likeData" }, 0] }
            : false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                authorId: 1,
                author: 1,
                caption: 1,
                media: 1,
                likesCount: 1,
                commentsCount: 1,
                sharesCount: 1,
                visibility: 1,
                isExclusive: 1,
                createdAt: 1,
                updatedAt: 1,
                isLiked: 1,
                status: 1,
                publishedAt: 1,
              },
            },
          ],
        },
      },
    ]);

    // const { data, pagination } = buildAggregatePagination(req, results);

    const data = results[0]?.data ?? [];
    const totalCount = results[0]?.metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    const pagination = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return res.status(200).json({
      status: "success",
      message: "Posts fetched successfully",
      data,
      pagination,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getAllPosts = async (req, res) => {
  const { page, limit, skip } = parsePagination(req);

  try {
    const viewerId = req.user?._id || null;
    const viewerObjectId = viewerId
      ? new mongoose.Types.ObjectId(viewerId)
      : null;

    const filter = {
      isExclusive: false,
      status: "published",
    };

    const results = await Post.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                username: 1,
                image: 1,
                role: 1,
              },
            },
          ],
          as: "author",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", viewerObjectId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "likeData",
        },
      },
      {
        $addFields: {
          isLiked: viewerObjectId
            ? { $gt: [{ $size: "$likeData" }, 0] }
            : false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                authorId: 1,
                author: 1,
                caption: 1,
                media: 1,
                likesCount: 1,
                commentsCount: 1,
                sharesCount: 1,
                visibility: 1,
                isExclusive: 1,
                createdAt: 1,
                updatedAt: 1,
                isLiked: 1,
                status: 1,
                publishedAt: 1,
              },
            },
          ],
        },
      },
    ]);

    // const { data, pagination } = buildAggregatePagination(req, results);
    const data = results[0]?.data ?? [];
    const totalCount = results[0].metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      status: "success",
      message: "Posts fetched successfully",
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getSheduledPost = async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const { startDate = "", endDate = "" } = req.query;

  try {
    const viewerId = req.user?._id || null;
    const viewerObjectId = viewerId
      ? new mongoose.Types.ObjectId(viewerId)
      : null;

    const filter = {
      isExclusive: false,
      status: "scheduled",
    };

    if (startDate && endDate) {
      const sd = new Date(startDate);
      const ed = new Date(endDate);

      sd.setHours(0, 0, 0, 0);
      ed.setHours(23, 59, 59, 999);
      filter.scheduledAt = {
        $gte: sd,
        $lt: ed,
      };
    }

    const results = await Post.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                username: 1,
                image: 1,
                role: 1,
              },
            },
          ],
          as: "author",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", viewerObjectId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "likeData",
        },
      },
      {
        $addFields: {
          isLiked: viewerObjectId
            ? { $gt: [{ $size: "$likeData" }, 0] }
            : false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                authorId: 1,
                author: 1,
                caption: 1,
                media: 1,
                likesCount: 1,
                commentsCount: 1,
                sharesCount: 1,
                visibility: 1,
                isExclusive: 1,
                createdAt: 1,
                updatedAt: 1,
                isLiked: 1,
                scheduledAt: 1,
                status: 1,
              },
            },
          ],
        },
      },
    ]);

    // const { data, pagination } = buildAggregatePagination(req, results);
    const data = results[0]?.data ?? [];
    const totalCount = results[0].metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      status: "success",
      message: "Posts fetched successfully",
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getUpcomingScheduledPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = 10;
    const now = new Date();

    const posts = await Post.aggregate([
      {
        $match: {
          authorId: new mongoose.Types.ObjectId(userId),
          status: "scheduled",
          scheduledAt: { $gte: now },
        },
      },
      {
        $sort: { scheduledAt: 1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                username: 1,
                image: 1,
                role: 1,
              },
            },
          ],
          as: "author",
        },
      },
      {
        $unwind: {
          path: "$author",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          authorId: 1,
          author: 1,
          caption: 1,
          media: 1,
          visibility: 1,
          isExclusive: 1,
          status: 1,
          scheduledAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      message: "Upcoming scheduled posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Get upcoming scheduled posts error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ status: "error", message: "Post not found" });
    }

    if (post.isExclusive) {
      return res
        .status(404)
        .json({ status: "error", message: "Post not found" });
    }

    const formattedPost = await formatPost(post, req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Post fetched successfully",
      data: formattedPost,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getUserPostsByUsername,
  getAllPosts,
  getPostById,
  getSheduledPost,
  getUpcomingScheduledPosts,
};
