const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    fine: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
