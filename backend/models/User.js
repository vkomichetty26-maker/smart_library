const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Simple plain text for migration, bcrypt recommended for production
    role: { type: String, enum: ['admin', 'librarian', 'faculty', 'student'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    department: { type: String },
    joined: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    // Role-specific fields
    employeeId: { type: String },
    rollNo: { type: String },
    year: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
