const router = require('express').Router();
const Request = require('../models/Request');
const Issue = require('../models/Issue');
const Book = require('../models/Book');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');

// GET all requests
router.get('/', async (req, res) => {
    try {
        const requests = await Request.find()
            .populate('user', 'name username role')
            .populate('book', 'title author available')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST create request
router.post('/', async (req, res) => {
    try {
        const { userId, bookId } = req.body;

        // Prevent duplicate pending request
        const existing = await Request.findOne({ user: userId, book: bookId, status: 'pending' });
        if (existing) return res.status(400).json({ message: 'You already have a pending request for this book.' });

        // Prevent if already issued
        const issued = await Issue.findOne({ user: userId, book: bookId, returnDate: null });
        if (issued) return res.status(400).json({ message: 'This book is already issued to you.' });

        const request = await Request.create({ user: userId, book: bookId, userId, bookId, note: req.body.note || '' });
        const populated = await Request.findById(request._id).populate('user','name').populate('book','title');
        res.status(201).json({ success: true, request: populated });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// PATCH approve request → auto-issue book
router.patch('/:id/approve', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        const book = await Book.findById(request.book);
        if (!book || book.available < 1) return res.status(400).json({ message: 'Book not available for issue.' });

        const settings = await Settings.findOne() || {};
        const days = req.body.days || settings.daysStudent || 14;
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + parseInt(days));

        await Issue.create({ user: request.user, book: request.book, issueDate: new Date(), dueDate });
        await Book.findByIdAndUpdate(request.book, { $inc: { available: -1 } });
        await Request.findByIdAndUpdate(req.params.id, { status: 'approved', actionDate: new Date() });

        // Trigger Notification
        await Notification.create({
            user: request.user,
            title: 'Request Approved',
            text: `Your request for "${book.title}" was approved and the book has been issued.`,
            icon: 'fa-check-circle text-ok'
        });

        res.json({ success: true, message: 'Request approved and book issued.' });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// PATCH reject request
router.patch('/:id/reject', async (req, res) => {
    try {
        const request = await Request.findByIdAndUpdate(req.params.id, { status: 'rejected', actionDate: new Date(), message: req.body.message || 'Request rejected.' });
        const book = await Book.findById(request.book);
        
        // Trigger Notification
        await Notification.create({
            user: request.user,
            title: 'Request Rejected',
            text: `Your request for "${book ? book.title : 'Book'}" was rejected. ${req.body.message ? 'Reason: ' + req.body.message : ''}`,
            icon: 'fa-times-circle text-err'
        });

        res.json({ success: true, message: 'Request rejected.' });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
