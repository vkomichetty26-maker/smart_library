const router = require('express').Router();
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'User not found.' });
        if (user.password !== password) return res.status(401).json({ message: 'Invalid password.' });
        if (user.active === false) return res.status(403).json({ message: 'Account is inactive.' });
        res.json({
            id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            email: user.email,
            phone: user.phone,
            department: user.department,
            rollNo: user.rollNo,
            employeeId: user.employeeId,
        });
    } catch(e) {
        res.status(500).json({ message: 'Server error', error: e.message });
    }
});

module.exports = router;
