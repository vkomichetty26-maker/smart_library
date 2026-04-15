const router = require('express').Router();
const Book = require('../models/Book');

// GET all books
router.get('/', async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        res.json(books);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST create book
router.post('/', async (req, res) => {
    try {
        const existing = await Book.findOne({ isbn: req.body.isbn });
        if (existing) return res.status(400).json({ message: `ISBN "${req.body.isbn}" already exists.` });
        const copies = parseInt(req.body.copies) || 1;
        const book = await Book.create({ ...req.body, copies, available: copies });
        res.status(201).json({ success: true, book });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// PUT update book
router.put('/:id', async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!book) return res.status(404).json({ message: 'Book not found' });
        res.json({ success: true, book });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// DELETE book
router.delete('/:id', async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
