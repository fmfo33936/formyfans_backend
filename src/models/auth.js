const mongoose = require("mongoose");

const AuthSchema = new mongoose.Schema(
  {
    image: { type: String },
    coverImage: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: { type: String, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phoneNumber: { type: String, trim: true, default: "", index: true },
    tagLine: { type: String, trim: true },
    bio: { type: String, trim: true },
    interests: { type: [String], trim: true },
    skills: { type: [String], trim: true },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"], default: "prefer_not_to_say" },
    dateOfBirth: { type: Date },

    password: { type: String, required: true, select: false },

    role: { type: String, enum: ["user", "creator"], default: "user" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    lastSeen: { type: Date },


    // Stats (denormalized)
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    photosCount: { type: Number, default: 0 },
    videosCount: { type: Number, default: 0 },

    // Account settings
    accountType: { type: String, enum: ["personal", "business", "creator"], default: "personal" },
    isPrivate: { type: Boolean, default: false },

    // Stripe

    stripeCustomerId: { type: String, default: null },
    activeSubscriptionId: { type: String, default: null },
    activeSubscriptionExpiresAt: { type: Date, default: null },

    // Internal users
    isInternalUser: { type: Boolean, default: false },

  },
  {
    timestamps: true,
    collection: "users",
  },
);

// AuthSchema.pre("validate", async function (next) {
//   if (this.isNew && !this.username) {
//     this.username = await generateUniqueUsername(this.firstName, this.lastName, this.model("users"));
//   }
//   next();
// });

module.exports = mongoose.model("users", AuthSchema);
