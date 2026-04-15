const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title:     { type: String, required: true },
    author:    { type: String, required: true },
    isbn:      { type: String, required: true, unique: true },
    category:  { type: String, default: 'General' },
    publisher: { type: String },
    edition:   { type: String },
    year:      { type: Number },
    copies:    { type: Number, default: 1 },
    available: { type: Number, default: 1 },
    location:  { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
