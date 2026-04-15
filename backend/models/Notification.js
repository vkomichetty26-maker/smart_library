const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }, // optional, for broadcasting to all users of a specific role (e.g. 'admin')
    title: { type: String, required: true },
    text: { type: String, required: true },
    icon: { type: String, default: 'fa-bell text-info' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
