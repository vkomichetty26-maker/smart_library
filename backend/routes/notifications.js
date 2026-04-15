const router = require('express').Router();
const Notification = require('../models/Notification');

// GET notifications for a specific user OR role
router.get('/:userId', async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.params.userId);
        
        const query = { $or: [{ user: req.params.userId }] };
        if (user && user.role) {
            query.$or.push({ role: user.role });
        }
        
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 }); // Newest first
        res.json(notifications);
    } catch(e) { 
        res.status(500).json({ message: e.message }); 
    }
});

// POST to create an explicit notification (can be used universally)
router.post('/', async (req, res) => {
    try {
        const { user, role, title, text, icon } = req.body;
        const notification = await Notification.create({ user, role, title, text, icon });
        res.status(201).json({ success: true, notification });
    } catch(e) { 
        res.status(400).json({ message: e.message }); 
    }
});

// PATCH to mark specific notifications as read (takes array of IDs)
router.patch('/mark-read', async (req, res) => {
    try {
        const { notificationIds } = req.body;
        if (!notificationIds || notificationIds.length === 0) {
            return res.json({ success: true, message: 'No notifications to mark.' });
        }
        await Notification.updateMany({ _id: { $in: notificationIds } }, { isRead: true });
        res.json({ success: true, message: 'Notifications marked as read.' });
    } catch(e) { 
        res.status(500).json({ message: e.message }); 
    }
});

module.exports = router;
