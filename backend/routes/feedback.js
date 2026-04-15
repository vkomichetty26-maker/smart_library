const router = require('express').Router();
const Feedback = require('../models/Feedback');

// GET all feedback
router.get('/', async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .populate('user', 'name username role')
            .sort({ createdAt: -1 });
        res.json(feedback);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST submit feedback
router.post('/', async (req, res) => {
    try {
        const { userId, rating, category, message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ message: 'Feedback message is required.' });
        const fb = await Feedback.create({ user: userId, userId, rating: rating || 5, category: category || 'General', message: message.trim() });
        res.status(201).json({ success: true, feedback: fb });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

module.exports = router;
