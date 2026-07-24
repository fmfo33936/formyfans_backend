const Story = require("../models/story");
const Follow = require("../models/follow");
const { AUTHOR_FIELDS, sanitizeAuthor } = require("../utils/socialHelpers");
const { createStorySchema } = require("../utils/validations");
const { schemaValidator } = require("../utils/validator");

const activeStoryFilter = () => ({ expiresAt: { $gt: new Date() } });

const formatStory = (story) => {
  const doc = story.toObject ? story.toObject() : { ...story };
  return {
    _id: doc._id,
    authorId: doc.authorId?._id ? doc.authorId._id : doc.authorId,
    author: doc.authorId?._id ? sanitizeAuthor(doc.authorId) : null,
    media: doc.media ?? "",
    mediaType: doc.mediaType,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
    updatedAt: doc.updatedAt,
  };
};

const createStory = async (req, res) => {
  const [error, validatedData] = schemaValidator(req.body, createStorySchema);
  if (error) return res.status(400).json({ status: "error", message: error });

  try {
    const userId = req.user._id;

    const story = await Story.create({
      authorId: userId,
      ...validatedData,
    });

    await story.populate("authorId", AUTHOR_FIELDS);

    const formattedStory = formatStory(story, userId);

    return res.status(200).json({
      status: "success",
      message: "Story created successfully",
      story: formattedStory,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getActiveStories = async (req, res) => {
  try {
    const userId = req.user._id;

    const following = await Follow.find({ followerId: userId }).select(
      "followingId",
    );
    const authorIds = [userId, ...following.map((f) => f.followingId)];

    const stories = await Story.find({
      authorId: { $in: authorIds },
      ...activeStoryFilter(),
    })
      .populate("authorId", AUTHOR_FIELDS)
      .sort({ createdAt: -1 });

    const grouped = {};
    for (const story of stories) {
      const authorKey = String(story.authorId._id || story.authorId);
      if (!grouped[authorKey]) {
        grouped[authorKey] = {
          author: sanitizeAuthor(story.authorId),
          stories: [],
        };
      }
      grouped[authorKey].stories.push(formatStory(story, userId));
    }

    return res.status(200).json({
      message: "Active stories fetched successfully",
      storyGroups: Object.values(grouped),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getActiveStoriesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const stories = await Story.find({
      authorId: userId,
      ...activeStoryFilter(),
    })
      .populate("authorId", AUTHOR_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Active stories fetched successfully",
      stories: stories.map((s) => formatStory(s, req.user?._id)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createStory,
  getActiveStories,
  getActiveStoriesByUser,
};
