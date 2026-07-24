const Joi = require("joi");

const loginSchema = Joi.object({
  email: Joi.string().email().max(254).lowercase().trim().required(),
  password: Joi.string().min(1).max(128).required(),
}).unknown(false);

const updateProfileSchema = Joi.object({
  image: Joi.string().uri().allow("").optional(),
  coverImage: Joi.string().uri().allow("").optional(),
  firstName: Joi.string().allow("").optional(),
  lastName: Joi.string().allow("").optional(),
  phoneNumber: Joi.string().allow("").optional(),
  tagLine: Joi.string().allow("").optional(),
  bio: Joi.string().allow("").optional(),
  interests: Joi.array().items(Joi.string()).allow("").optional(),
  skills: Joi.array().items(Joi.string()).allow("").optional(),
}).unknown(false);

const updateEmailSchema = Joi.object({
  email: Joi.string().email().required(),
}).unknown(false);

const updateUsernameSchema = Joi.object({
  username: Joi.string().required(),
}).unknown(false);

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
  confirmNewPassword: Joi.string().required(),
}).unknown(false);

const checkUsernameAvailabilitySchema = Joi.object({
  username: Joi.string().required(),
}).unknown(false);

const suggestUsernameSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
}).unknown(false);

const createUserSchema = Joi.object({
  image: Joi.string().uri().allow("").required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  username: Joi.string().required(),
  role: Joi.string().valid("user", "creator").required(),
  otp: Joi.string().required(),
  password: Joi.string().required(),
}).unknown(false);

const followUserSchema = Joi.object({
  userId: Joi.string().required(),
}).unknown(false);

const uploadMediaSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  type: Joi.string().valid("photo", "video").required(),
  thumbnail: Joi.string().uri().allow("").optional(),
  thumbnailPublicId: Joi.string().allow("").optional(),
  caption: Joi.string().allow("").optional(),
  size: Joi.number().optional(),
  duration: Joi.number().optional(),
}).unknown(false);

const addFavouriteSchema = Joi.object({
  favouriteUserId: Joi.string().required(),
}).unknown(false);

const likePostSchema = Joi.object({
  postId: Joi.string().required(),
}).unknown(false);

const createPostSchema = Joi.object({
  caption: Joi.string().allow("").optional(),
  media: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        mediaType: Joi.string().valid("image", "video", "gif").required(),
      }),
    )
    .optional(),
  scheduledAt: Joi.date().greater("now").optional(),
  // visibility: Joi.string().valid("public", "followers", "private").required(),
})
  .or("caption", "media")
  .unknown(false);

const updatePostSchema = Joi.object({
  caption: Joi.string().allow("").optional(),
  media: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        mediaType: Joi.string().valid("image", "video", "gif").required(),
      }),
    )
    .optional(),
  visibility: Joi.string().valid("public", "followers", "private").optional(),
  scheduledAt: Joi.date().greater("now").optional(),
})
  .or("caption", "media", "visibility", "scheduledAt")
  .unknown(false);

const createStorySchema = Joi.object({
  media: Joi.string().uri().required(),
  mediaType: Joi.string().valid("image", "video").required(),
}).unknown(false);

const buySubscriptionSchema = Joi.object({
  planId: Joi.string().required(),
  paymentIntentId: Joi.string().required(),
}).unknown(false);

const dismissFollowSuggestionSchema = Joi.object({
  dismissedUserId: Joi.string().required(),
}).unknown(false);

const sharePostSchema = Joi.object({
  postId: Joi.string().required(),
  recipientIds: Joi.array().items(Joi.string()).required(),
}).unknown(false);

const updateProfileUsernameSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_.]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, underscore (_) and dot (.)",
      "string.min": "Username must be at least 3 characters long",
      "string.max": "Username cannot exceed 30 characters",
      "string.empty": "Username is required",
      "any.required": "Username is required",
    }),
}).unknown(false);

const createExclusiveContentSchema = Joi.object({
  isExclusive: Joi.boolean().default(true),
  title: Joi.string().trim().required(),
  caption: Joi.string().trim().required(),
  tags: Joi.array().optional(),
  media: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        mediaType: Joi.string().valid("image", "video", "gif").required(),
      }),
    )
    .required(),
  visibility: Joi.string().valid("exclusive").required(),
}).unknown(false);

const updateExclusiveContentSchema = Joi.object({
  title: Joi.string().trim().optional(),
  caption: Joi.string().trim().optional(),
  tags: Joi.array().optional(),
  media: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        mediaType: Joi.string().valid("image", "video", "gif").required(),
      }),
    )
    .optional(),
}).unknown(false);

const createCreatorSubscriptionSchema = Joi.object({
  price: Joi.number().min(1).max(99).required(),
}).unknown(false);

const createCampaignObjectiveSchema = Joi.object({
  icon: Joi.string().trim().required(),
  name: Joi.string().trim().lowercase().min(2).max(60).required(),
  description: Joi.string().trim().min(10).max(150).required(),
}).unknown(false);

const updateCampaignObjectiveSchema = Joi.object({
  icon: Joi.string().trim().optional(),
  name: Joi.string().trim().lowercase().min(2).max(60).optional(),
  description: Joi.string().trim().min(10).max(150).optional(),
}).unknown(false);

const createCampaignCategorySchema = Joi.object({
  name: Joi.string().trim().lowercase().min(2).max(60).required(),
}).unknown(false);

const updateCampaignCategorySchema = Joi.object({
  name: Joi.string().trim().lowercase().min(2).max(60).optional(),
}).unknown(false);

// ---- Advertisement sub-schema (reusable) ----
const advertisementSchema = Joi.object({
  headline: Joi.string().min(2).max(60).required(),
  primaryText: Joi.string().min(2).max(300).required(),
  callToAction: Joi.string()
    .valid(
      "shop_now",
      "learn_more",
      "sign_up",
      "book_now",
      "get_offer",
      "download",
      "subscribe",
    )
    .required(),
  designationUrl: Joi.string().uri().required(),
});

// ---- CREATE (Add) Schema ----
const createCampaignSchema = Joi.object({
  objective: Joi.string().hex().length(24).required(), // ObjectId
  category: Joi.string().hex().length(24).required(), // ObjectId

  name: Joi.string().min(2).max(60).lowercase().trim().required(),
  brand: Joi.string().min(2).max(60).trim().required(),
  description: Joi.string().min(10).max(300).trim().optional().allow("", null),

  creators: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),

  location: Joi.object({
    type: Joi.string().valid("Point").default("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2).required(), // [longitude, latitude]
  }).required(),

  gender: Joi.string().valid("all", "men", "women").required(),

  ageRange: Joi.object({
    min: Joi.number().min(0).max(100).default(0),
    max: Joi.number().min(0).max(100).default(100),
  })
    .custom((value, helpers) => {
      if (value.min > value.max) {
        return helpers.message(
          "ageRange.min cannot be greater than ageRange.max",
        );
      }
      return value;
    })
    .optional(),

  interests: Joi.array().items(Joi.string()).min(1).required(),

  budgetType: Joi.string().valid("daily", "lifetime").required(),
  dailyBudget: Joi.number().positive().required(),

  // ---- Schedule fields ----
  launchType: Joi.string()
    .valid("immediate", "scheduled")
    .default("immediate")
    .required(),

  startDateTime: Joi.date()
    .iso()
    .when("launchType", {
      is: "scheduled",
      then: Joi.date().greater("now").required().messages({
        "date.greater":
          "Start date/time must be in the future for scheduled campaigns.",
        "any.required":
          "Start date/time is required when launchType is 'scheduled'.",
      }),
      otherwise: Joi.optional(),
    }),

  endDateTime: Joi.date()
    .iso()
    .required()
    .when("launchType", {
      is: "scheduled",
      then: Joi.date().greater(Joi.ref("startDateTime")).messages({
        "date.greater": "End date/time must be after the start date/time.",
      }),
      otherwise: Joi.date().greater("now").messages({
        "date.greater": "End date/time must be after the current time.",
      }),
    }),

  advertisement: advertisementSchema.required(),

  paymentMethodId: Joi.string().required(),
}).unknown(false);

// ---- UPDATE (Edit) Schema ----
const updateCampaignSchema = Joi.object({
  objective: Joi.string().hex().length(24),
  category: Joi.string().hex().length(24),

  name: Joi.string().min(2).max(60).lowercase().trim(),
  brand: Joi.string().min(2).max(60).trim(),
  description: Joi.string().min(10).max(300).trim(),

  creators: Joi.array().items(Joi.string().hex().length(24)).min(1),

  location: Joi.object({
    type: Joi.string().valid("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2),
  }),

  gender: Joi.string().valid("all", "men", "women"),

  ageRange: Joi.object({
    min: Joi.number().min(0).max(100),
    max: Joi.number().min(0).max(100),
  }).custom((value, helpers) => {
    if (
      value.min !== undefined &&
      value.max !== undefined &&
      value.min > value.max
    ) {
      return helpers.message(
        "ageRange.min cannot be greater than ageRange.max",
      );
    }
    return value;
  }),

  interests: Joi.array().items(Joi.string()).min(1),

  // budgetType: Joi.string().valid("daily", "lifetime"),
  // dailyBudget: Joi.number().positive(),

  // launchType: Joi.string().valid("immediate", "scheduled"),

  // startDateTime: Joi.date()
  //   .iso()
  //   .when("launchType", {
  //     is: "scheduled",
  //     then: Joi.date().greater("now").messages({
  //       "date.greater":
  //         "Start date/time must be in the future for scheduled campaigns.",
  //     }),
  //     otherwise: Joi.optional(),
  //   }),

  // endDateTime: Joi.date()
  //   .iso()
  //   .when("startDateTime", {
  //     is: Joi.exist(),
  //     then: Joi.date().greater(Joi.ref("startDateTime")).messages({
  //       "date.greater": "End date/time must be after the start date/time.",
  //     }),
  //     otherwise: Joi.optional(),
  //   }),

  advertisement: advertisementSchema,
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update the campaign.",
  })
  .unknown(false);

module.exports = {
  loginSchema,
  updateProfileSchema,
  updateEmailSchema,
  updateUsernameSchema,
  updatePasswordSchema,
  checkUsernameAvailabilitySchema,
  suggestUsernameSchema,
  createUserSchema,
  followUserSchema,
  uploadMediaSchema,
  addFavouriteSchema,
  likePostSchema,
  createPostSchema,
  updatePostSchema,
  createStorySchema,
  buySubscriptionSchema,
  dismissFollowSuggestionSchema,
  sharePostSchema,
  updateProfileUsernameSchema,
  createExclusiveContentSchema,
  updateExclusiveContentSchema,
  createCreatorSubscriptionSchema,
  createCampaignObjectiveSchema,
  updateCampaignObjectiveSchema,
  createCampaignCategorySchema,
  updateCampaignCategorySchema,
  createCampaignSchema,
  updateCampaignSchema,
};
