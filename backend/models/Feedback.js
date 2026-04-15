const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userId: { type: String },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    category: { type: String, default: 'General' },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
