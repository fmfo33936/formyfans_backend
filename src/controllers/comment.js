const Post = require("../models/post");
const Comment = require("../models/comment");
const Follow = require("../models/follow");
const { createNotification } = require("../utils/notificationHelper");
const { logActivity } = require("../utils/activityLogger");
const {
  AUTHOR_FIELDS,
  parsePagination,
  buildPagination,
  assertOwner,
  sanitizeAuthor,
  canViewPost,
} = require("../utils/socialHelpers");

const formatComment = (comment) => {
  const doc = comment.toObject ? comment.toObject() : { ...comment };
  return {
    _id: doc._id,
    postId: doc.postId,
    authorId: doc.authorId?._id ? doc.authorId._id : doc.authorId,
    author: doc.authorId?._id ? sanitizeAuthor(doc.authorId) : null,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "content is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // const allowed = await canViewPost(post, req.user._id, Follow);
    // if (!allowed) {
    //   return res
    //     .status(403)
    //     .json({
    //       message: "You do not have permission to comment on this post",
    //     });
    // }

    const comment = await Comment.create({
      postId,
      authorId: req.user._id,
      content: String(content).trim(),
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    await comment.populate("authorId", AUTHOR_FIELDS);

    res.status(201).json({
      status: "success",
      message: "Comment created successfully",
      comment: formatComment(comment),
    });

    // Notify post author (exclude self-comment)
    setImmediate(async () => {
      const postAuthorId = post.authorId;
      const commenterId = req.user._id;
      const tasks = [
        logActivity(req, {
          userId: commenterId,
          action: "comment_added",
          targetType: "comments",
          targetId: comment._id,
          meta: { postId, message: "Comment created successfully" },
        }),
      ];
      if (postAuthorId?.toString() !== commenterId?.toString()) {
        tasks.push(
          createNotification({
            recipientId: postAuthorId,
            senderId: commenterId,
            type: "post_commented",
            targetType: "comments",
            targetId: comment._id,
            title: "New comment",
            message: `Your post has a new comment by ${req.user.firstName} ${req.user.lastName}`,
            meta: { postId, commentId: comment._id },
          }),
        );
      }
      await Promise.allSettled(tasks);
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const ownershipError = assertOwner(comment.authorId, req.user._id);
    if (ownershipError) {
      return res.status(403).json({ message: ownershipError });
    }

    await Comment.deleteOne({ _id: commentId });

    const post = await Post.findById(postId);
    if (post && post.commentsCount > 0) {
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });
    }

    res.status(200).json({ message: "Comment deleted successfully" });

    setImmediate(async () => {
      await logActivity(req, {
        userId: req.user._id,
        action: "comment_deleted",
        targetType: "comments",
        targetId: comment._id,
        meta: { postId, message: "Comment deleted successfully" },
      });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user?._id || null;
    const { page, limit, skip } = parsePagination(req);

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // const allowed = await canViewPost(post, viewerId, Follow);
    // if (!allowed) {
    //   return res.status(403).json({ message: "You do not have permission to view comments on this post" });
    // }

    const [comments, totalComments] = await Promise.all([
      Comment.find({ postId })
        .populate("authorId", AUTHOR_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ postId }),
    ]);

    return res.status(200).json({
      message: "Comments fetched successfully",
      comments: comments.map(formatComment),
      pagination: buildPagination(page, limit, totalComments),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createComment,
  deleteComment,
  getPostComments,
};
