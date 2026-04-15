const router = require('express').Router();
const Issue = require('../models/Issue');
const Book  = require('../models/Book');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');

// GET all issues (with user and book populated)
router.get('/', async (req, res) => {
    try {
        const issues = await Issue.find()
            .populate('user', 'name username role department')
            .populate('book', 'title author isbn category')
            .sort({ createdAt: -1 });
        res.json(issues);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST issue a book
router.post('/', async (req, res) => {
    try {
        const { userId, bookId, dueDate } = req.body;
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (book.available < 1) return res.status(400).json({ message: `"${book.title}" is not available.` });

        // Check if user already has this book issued
        const existing = await Issue.findOne({ user: userId, book: bookId, returnDate: null });
        if (existing) return res.status(400).json({ message: 'User already has this book issued.' });

        const settings = await Settings.findOne();
        const loanDays = dueDate ? null : (settings?.daysStudent || 14);
        const due = dueDate ? new Date(dueDate) : (() => { const d = new Date(); d.setDate(d.getDate() + loanDays); return d; })();

        const issue = await Issue.create({ user: userId, book: bookId, issueDate: new Date(), dueDate: due });
        await Book.findByIdAndUpdate(bookId, { $inc: { available: -1 } });

        // Trigger Notification
        await Notification.create({
            user: userId,
            title: 'Book Issued',
            text: `The book "${book.title}" has been issued to you. Due date: ${due.toISOString().slice(0,10)}.`,
            icon: 'fa-book text-info'
        });

        const populated = await Issue.findById(issue._id)
            .populate('user', 'name username role')
            .populate('book', 'title author');
        res.status(201).json({ success: true, issue: populated });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// PATCH return a book
router.patch('/:id/return', async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: 'Issue record not found' });
        if (issue.returnDate) return res.status(400).json({ message: 'Book already returned' });

        const returnDate = new Date();
        const fine = req.body.fine || 0;
        await Issue.findByIdAndUpdate(req.params.id, { returnDate, fine });
        
        const book = await Book.findByIdAndUpdate(issue.book, { $inc: { available: 1 } });

        // Trigger Notification
        await Notification.create({
            user: issue.user,
            title: 'Book Returned',
            text: `You have successfully returned "${book.title}".${fine > 0 ? ' Fine paid: ₹' + fine : ''}`,
            icon: 'fa-undo text-ok'
        });

        res.json({ success: true, message: `Book returned. Fine: ₹${fine}` });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
