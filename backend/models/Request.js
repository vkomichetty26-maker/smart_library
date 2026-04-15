const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: String }, // legacy compat
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    bookId: { type: String }, // legacy compat
    note: { type: String, default: '' },
    status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    message: { type: String },
    requestDate: { type: Date, default: Date.now },
    actionDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
