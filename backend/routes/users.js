const router = require('express').Router();
const User = require('../models/User');

// GET all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// POST create user
router.post('/', async (req, res) => {
    try {
        const { name, username, password, role, email, phone, department, rollNo, employeeId } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: `Username "${username}" already exists.` });
        const user = await User.create({ name, username, password, role: role||'student', email: email||`${username}@smartlib.edu`, phone, department, rollNo, employeeId });
        res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// PUT update user
router.put('/:id', async (req, res) => {
    try {
        const { password, ...data } = req.body;
        if (password) data.password = password;
        const user = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, user });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
