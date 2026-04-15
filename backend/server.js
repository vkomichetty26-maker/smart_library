require('dotenv').config();
// touch for nodemon restart
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Connect DB
connectDB();

// API Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/books',    require('./routes/books'));
app.use('/api/issues',   require('./routes/issues'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/stats',    require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/', (req, res) => res.json({ status: 'SmartLib API Running', version: '2.0.0' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🟢 SmartLib Backend running on http://localhost:${PORT}`);
    console.log(`   Database: MongoDB via Mongoose`);
});
