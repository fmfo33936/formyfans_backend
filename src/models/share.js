const mongoose = require('mongoose');

const ShareSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'posts', required: true },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
},
    { timestamps: true, collection: "shares" }
);

module.exports = mongoose.model('shares', ShareSchema);