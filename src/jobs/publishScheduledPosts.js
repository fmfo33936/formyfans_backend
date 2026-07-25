// jobs/publishScheduledPosts.js
const cron = require("node-cron");
const Post = require("../models/post");
const logger = require("../utils/logger");
const { logActivity } = require("../utils/activityLogger");

const publishScheduledPosts = async () => {
  const now = new Date();

  try {
    const duePosts = await Post.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    }).select("_id authorId");

    if (duePosts.length === 0) return;

    const postIds = duePosts.map((p) => p._id);

    const result = await Post.updateMany(
      { _id: { $in: postIds } },
      { $set: { status: "published", publishedAt: now } },
    );

    logger.info(`Published ${result.modifiedCount} scheduled post(s)`);

    for (const post of duePosts) {
      try {
        await logActivity(null, {
          userId: post.authorId,
          action: "post_published",
          targetType: "posts",
          targetId: post._id,
          meta: {
            message: "Your post has been published",
          },
        });
      } catch (logError) {
        logger.error(
          `Failed to log activity for post ${post._id}: ${logError.message}`,
        );
      }
    }
  } catch (error) {
    logger.error(`Error publishing scheduled posts: ${error.message}`);
  }
};

const startScheduledPostCron = () => {
  cron.schedule("* * * * *", publishScheduledPosts);
  logger.info("Scheduled post publisher cron started");
};

module.exports = startScheduledPostCron;
