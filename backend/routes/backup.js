const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const Issue = require('../models/Issue');

router.post('/restore', async (req, res) => {
    try {
        const { users, books, issues } = req.body;
        
        // Restore users if present
        if (users && Array.isArray(users)) {
            await User.deleteMany({});
            await User.insertMany(users);
        }
        
        // Restore books if present
        if (books && Array.isArray(books)) {
            await Book.deleteMany({});
            await Book.insertMany(books);
        }
        
        // Restore issues if present
        if (issues && Array.isArray(issues)) {
            await Issue.deleteMany({});
            await Issue.insertMany(issues);
        }

        res.json({ message: 'Backup restored successfully' });
    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Server error during restore' });
    }
});

module.exports = router;
