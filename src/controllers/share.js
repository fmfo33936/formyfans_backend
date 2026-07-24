const ShareModel = require("../models/share");
const MessageModel = require("../models/message");
const PostModel = require("../models/post");
const { sharePostSchema } = require("../utils/validations");
const { schemaValidator } = require("../utils/validator");
const { logActivity } = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationHelper");
const ConversationModel = require("../models/conversation");

const SHARE_MESSAGE = "Sent an attachment";

const buildSharedPostPayload = (post, postId) => ({
  postId,
  caption: post.caption || "",
  ...(post.media?.[0] && {
    media: {
      url: post.media[0].url,
      mediaType: post.media[0].mediaType,
    },
  }),
});

const populateSharedPostMessage = (message) =>
  message.populate({
    path: "sharedPost.postId",
    select: "_id caption media authorId",
    populate: {
      path: "authorId",
      select: "_id image firstName lastName username",
    },
  });

const sharePost = async (req, res) => {
  const [error, validatedData] = schemaValidator(req.body, sharePostSchema);
  if (error) return res.status(400).json({ status: "error", message: error });

  try {
    const user = req.user;
    const { postId, recipientIds } = validatedData;
    const io = req.app.get("socketio");

    const post = await PostModel.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ status: "error", message: "Post not found" });
    }

    const uniqueRecipientIds = [
      ...new Set(
        recipientIds.filter((id) => id.toString() !== user._id.toString()),
      ),
    ];

    if (uniqueRecipientIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "At least one valid recipient is required",
      });
    }

    const sharedPost = buildSharedPostPayload(post, postId);

    const newShare = await ShareModel.create({
      post: postId,
      sharedBy: user._id,
      sharedWith: uniqueRecipientIds,
    });

    for (const recipientId of uniqueRecipientIds) {
      const conversation = await ConversationModel.findOne({
        participants: { $all: [user._id, recipientId] },
      }).sort({ lastUpdated: -1 });

      if (conversation) {
        const newMessage = await MessageModel.create({
          conversationId: conversation.conversationId,
          senderId: user._id,
          receiverId: recipientId,
          message: SHARE_MESSAGE,
          sharedPost,
        });

        conversation.lastMessage = {
          message: SHARE_MESSAGE,
          sender: user._id,
          createdAt: new Date(),
        };
        conversation.lastUpdated = new Date();
        conversation.messagesCount += 1;

        const currentUnreadCount =
          conversation.unreadMessagesCount.get(recipientId.toString()) ||
          conversation.unreadMessagesCount.get(recipientId) ||
          0;
        conversation.unreadMessagesCount.set(
          recipientId,
          currentUnreadCount + 1,
        );

        await conversation.save();

        const conObj = {
          conversationId: conversation.conversationId,
          lastMessage: conversation.lastMessage,
          lastUpdated: conversation.lastUpdated,
          unreadMessagesCount: Object.fromEntries(
            conversation.unreadMessagesCount,
          ),
        };

        await populateSharedPostMessage(newMessage);

        io.to(`user_${recipientId}`).emit("update_conversation", conObj);
        io.to(`user_${user._id}`).emit("update_conversation", conObj);
        io.to(conversation.conversationId).emit("receive_message", newMessage);
        continue;
      }

      const payload = {
        participants: [user._id, recipientId],
        conversationId: `${user._id}_${recipientId}`,
        lastMessage: {
          message: SHARE_MESSAGE,
          sender: user._id,
          createdAt: new Date(),
        },
        lastUpdated: new Date(),
        messagesCount: 1,
        unreadMessagesCount: new Map([
          [recipientId, 1],
          [user._id, 0],
        ]),
      };

      const newConversation = await ConversationModel.create(payload);
      const newMessage = await MessageModel.create({
        conversationId: newConversation.conversationId,
        senderId: user._id,
        receiverId: recipientId,
        message: SHARE_MESSAGE,
        sharedPost,
      });

      await populateSharedPostMessage(newMessage);

      const populatedConversation = await newConversation.populate([
        {
          path: "participants",
          select: "_id image firstName lastName",
        },
      ]);

      io.to(`user_${recipientId}`).emit(
        "new_conversation",
        populatedConversation,
      );
      io.to(`user_${user._id}`).emit("new_conversation", populatedConversation);
      io.to(newConversation.conversationId).emit("receive_message", newMessage);
    }

    res.status(200).json({
      status: "success",
      message: "Post shared successfully",
      share: newShare,
    });

    setImmediate(async () => {
      const tasks = [
        PostModel.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } }),
        logActivity(req, {
          userId: user._id,
          action: "post_shared",
          targetType: "posts",
          targetId: postId,
          meta: {
            postId,
            message: "You have shared a post",
            userId: user._id,
            recipientIds: uniqueRecipientIds,
          },
        }),
      ];

      if (post.authorId.toString() !== user._id.toString()) {
        tasks.push(
          createNotification({
            recipientId: post.authorId,
            senderId: user._id,
            type: "post_shared",
            targetType: "posts",
            targetId: postId,
            title: "Post shared",
            message: `Your post has been shared by ${user.firstName} ${user.lastName}`,
            meta: {
              postId,
              message: `Your post has been shared by ${user.firstName} ${user.lastName}`,
              userId: user._id,
              recipientIds: uniqueRecipientIds,
            },
          }),
        );
      }

      await Promise.allSettled(tasks);
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = { sharePost };
