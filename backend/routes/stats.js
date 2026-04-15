const router = require('express').Router();
const User   = require('../models/User');
const Book   = require('../models/Book');
const Issue  = require('../models/Issue');
const Settings = require('../models/Settings');

// GET aggregated stats for the home page and admin overview
router.get('/', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const [totalUsers, totalBooks, books, issues, settings] = await Promise.all([
            User.countDocuments(),
            Book.countDocuments(),
            Book.find(),
            Issue.find().populate('user'),
            Settings.findOne(),
        ]);

        const fpd = settings?.finePerDay || 5;
        const totalCopies = books.reduce((a, b) => a + b.copies, 0);
        const availableCopies = books.reduce((a, b) => a + b.available, 0);

        const activeIssues = issues.filter(i => !i.returnDate).length;
        const overdueIssues = issues.filter(i => !i.returnDate && (i.dueDate?.toISOString().slice(0,10) || '') < today).length;
        const totalFines = issues
            .filter(i => !i.returnDate && i.dueDate?.toISOString().slice(0,10) < today)
            .reduce((a, i) => {
                if (i.user?.role === 'faculty') return a;
                const days = Math.ceil((new Date() - new Date(i.dueDate)) / 86400000);
                return a + days * fpd;
            }, 0);

        const students = await User.countDocuments({ role: 'student' });

        res.json({ totalUsers, totalBooks, totalCopies, availableCopies, activeIssues, overdueIssues, totalFines, students });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
