const router = require('express').Router();
const Settings = require('../models/Settings');

// GET settings (return first doc or defaults)
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch(e) { res.status(500).json({ message: e.message }); }
});

// PUT upsert settings
router.put('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(req.body);
        } else {
            Object.assign(settings, req.body);
            await settings.save();
        }
        res.json({ success: true, settings });
    } catch(e) { res.status(400).json({ message: e.message }); }
});

module.exports = router;
