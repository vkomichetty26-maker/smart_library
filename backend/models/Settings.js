const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    institution: { type: String, default: 'SmartLib University' },
    finePerDay: { type: Number, default: 5 },
    maxBooksStudent: { type: Number, default: 3 },
    maxBooksFaculty: { type: Number, default: 10 },
    daysStudent: { type: Number, default: 14 },
    daysFaculty: { type: Number, default: 30 },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
