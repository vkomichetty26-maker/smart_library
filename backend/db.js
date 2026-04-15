const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

async function connectDB() {
    // 1. Try the real MongoDB URI first
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library_db';

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log('✅ Connected to MongoDB');
        return;
    } catch (_) {
        console.log('⚠️  Real MongoDB not found. Starting in-memory MongoDB…');
    }

    // 2. Fall back to in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('✅ Connected to MongoDB (in-memory) — data resets on restart');

    // 3. Auto seed the in-memory DB
    await autoSeed();
}

async function autoSeed() {
    const User     = require('./models/User');
    const Book     = require('./models/Book');
    const Settings = require('./models/Settings');

    const count = await User.countDocuments();
    if (count > 0) return; // already seeded

    console.log('📦 Auto-seeding demo data…');

    const USERS = [
        { name:'Super Admin',       username:'admin',      password:'admin123',  role:'admin',     email:'admin@smartlib.edu',     department:'Administration' },
        { name:'Priya Librarian',   username:'librarian',  password:'lib123',    role:'librarian', email:'librarian@smartlib.edu', department:'Library' },
        { name:'Dr. Ramesh Kumar',  username:'faculty1',   password:'fac123',    role:'faculty',   email:'rkumar@smartlib.edu',    department:'Computer Science', employeeId:'FAC001' },
        { name:'Prof. Anisha Gupta',username:'faculty2',   password:'fac123',    role:'faculty',   email:'agupta@smartlib.edu',    department:'Mathematics',      employeeId:'FAC002' },
        { name:'Arjun Sharma',      username:'student1',   password:'std123',    role:'student',   email:'arjun@smartlib.edu',     department:'CSE', rollNo:'CS2024001' },
        { name:'Priya Singh',       username:'student2',   password:'std123',    role:'student',   email:'priya@smartlib.edu',     department:'IT',  rollNo:'IT2024002' },
        { name:'Ravi Patel',        username:'student3',   password:'std123',    role:'student',   email:'ravi@smartlib.edu',      department:'ECE', rollNo:'EC2024003' },
        { name:'Sneha Joshi',       username:'student4',   password:'std123',    role:'student',   email:'sneha@smartlib.edu',     department:'ME',  rollNo:'ME2024004' },
    ];

    const BOOKS = [
        { title:'Introduction to Algorithms',           author:'Cormen, Leiserson, Rivest',    isbn:'978-0262033848', category:'Algorithms',           publisher:'MIT Press',       edition:'4th', year:2022, copies:5 },
        { title:'The Pragmatic Programmer',             author:'Andrew Hunt, David Thomas',    isbn:'978-0135957059', category:'Software Engineering', publisher:'Addison-Wesley',  edition:'2nd', year:2019, copies:3 },
        { title:'Clean Code',                          author:'Robert C. Martin',             isbn:'978-0132350884', category:'Software Engineering', publisher:'Prentice Hall',   edition:'1st', year:2008, copies:4 },
        { title:'Design Patterns',                     author:'Gang of Four',                 isbn:'978-0201633610', category:'Software Engineering', publisher:'Addison-Wesley',  edition:'1st', year:1994, copies:3 },
        { title:'Python Crash Course',                 author:'Eric Matthes',                 isbn:'978-1593279288', category:'Programming',          publisher:'No Starch Press', edition:'3rd', year:2023, copies:6 },
        { title:'JavaScript: The Good Parts',          author:'Douglas Crockford',            isbn:'978-0596517748', category:'Programming',          publisher:"O'Reilly",        edition:'1st', year:2008, copies:4 },
        { title:'Artificial Intelligence: A Modern Approach', author:'Russell & Norvig',     isbn:'978-0136042594', category:'AI / Machine Learning', publisher:'Pearson',         edition:'4th', year:2020, copies:4 },
        { title:'Deep Learning',                       author:'Goodfellow, Bengio, Courville',isbn:'978-0262035613', category:'AI / Machine Learning', publisher:'MIT Press',       edition:'1st', year:2016, copies:3 },
        { title:'Database System Concepts',            author:'Silberschatz, Korth',          isbn:'978-0078022159', category:'Databases',            publisher:'McGraw-Hill',     edition:'7th', year:2019, copies:5 },
        { title:'MongoDB: The Definitive Guide',       author:'Kristina Chodorow',            isbn:'978-1491954461', category:'Databases',            publisher:"O'Reilly",        edition:'3rd', year:2019, copies:3 },
        { title:'Computer Networks',                   author:'Andrew S. Tanenbaum',          isbn:'978-0132126953', category:'Networking',           publisher:'Pearson',         edition:'5th', year:2010, copies:4 },
        { title:'Operating System Concepts',           author:'Silberschatz, Galvin, Gagne',  isbn:'978-1119320913', category:'Systems',             publisher:'Wiley',           edition:'10th',year:2018, copies:5 },
        { title:'Discrete Mathematics',               author:'Kenneth Rosen',                isbn:'978-0072899054', category:'Mathematics',          publisher:'McGraw-Hill',     edition:'7th', year:2011, copies:4 },
        { title:'Linear Algebra and Its Applications',author:'David C. Lay',                 isbn:'978-0321982384', category:'Mathematics',          publisher:'Pearson',         edition:'5th', year:2015, copies:3 },
        { title:'Engineering Physics',                 author:'Gaur & Gupta',                 isbn:'978-8121903530', category:'Physics',              publisher:'Dhanpat Rai',     edition:'3rd', year:2020, copies:4 },
        { title:'Signals and Systems',                 author:'Alan V. Oppenheim',            isbn:'978-0138147570', category:'Systems',             publisher:'Pearson',         edition:'2nd', year:1996, copies:3 },
    ];

    for (const u of USERS) await User.create(u);
    for (const b of BOOKS) await Book.create({ ...b, available: b.copies });
    await Settings.create({ institution:'SmartLib University', finePerDay:5, maxBooksStudent:3, maxBooksFaculty:10, daysStudent:14, daysFaculty:30 });

    console.log(`✅ Seeded ${USERS.length} users, ${BOOKS.length} books, settings`);
    console.log('\n📋 Login Credentials:');
    console.log('  Admin:     admin / admin123');
    console.log('  Librarian: librarian / lib123');
    console.log('  Faculty:   faculty1 / fac123');
    console.log('  Student:   student1 / std123\n');
}

module.exports = connectDB;
