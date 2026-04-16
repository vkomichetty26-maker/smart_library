# 📚 SmartLib - Library Management System

A full-stack library management system built with React, Node.js, Express, and MongoDB Atlas.

---

## ⚙️ Prerequisites (Install These First)

Before running this project, make sure you have the following installed:

1. **Node.js** (v18 or higher) → https://nodejs.org/
2. **MongoDB Atlas account** (free) → https://cloud.mongodb.com

---

## 🚀 Setup & Run (Step by Step)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 2 — Install All Dependencies
```bash
npm install
cd backend && npm install && cd ..
cd react && npm install && cd ..
```

### Step 3 — Configure Environment Variables

Create a `.env` file inside the `backend/` folder:
```bash
copy backend\.env.example backend\.env
```

Then open `backend/.env` and fill in your MongoDB Atlas connection string:
```env
PORT=5000
MONGODB_URI=mongodb://YOUR_USER:YOUR_PASSWORD@ac-xxxxx.mongodb.net:27017,...?ssl=true&replicaSet=...&authSource=admin
JWT_SECRET=supersecretjwtkey_smartlib
ALLOW_IN_MEMORY_FALLBACK=false
```

> See `.env.example` for the format. Get your connection string from MongoDB Atlas → Connect → Drivers.

### Step 4 — Seed the Database (First Time Only)
```bash
cd backend
node seed.js
cd ..
```

This creates all demo users, books, and settings in your Atlas database.

### Step 5 — Start the Application
```bash
npm run dev
```

This starts both the backend (port 5000) and React frontend (port 5173) together.

---

## 🌐 Access the App

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:5000       |

---

## 🔑 Default Login Credentials (after seeding)

| Role      | Username    | Password   |
|-----------|-------------|------------|
| Admin     | `admin`     | `admin123` |
| Librarian | `librarian` | `lib123`   |
| Faculty   | `faculty1`  | `fac123`   |
| Student   | `student1`  | `std123`   |

> **Note:** Run `node seed.js` only once. Running it again will reset and re-create all data.

---

## 🛠️ Troubleshooting

### ❌ "Could not connect to any servers in your MongoDB Atlas cluster"
→ Your IP is not whitelisted. Go to Atlas → Network Access → Add IP Address → Allow Access from Anywhere.

### ❌ "querySrv ECONNREFUSED"
→ Your ISP blocks SRV DNS lookups. Use the **standard connection string** (not `mongodb+srv://`) from Atlas → Connect → Drivers → toggle off "SRV Connection String".

### ❌ "Authentication failed"
→ Wrong password in your `.env`. Re-check it against Atlas → Database Access.

### ❌ "Cannot find module" errors
→ You skipped `npm install`. Run Step 2 again.

### ❌ Port already in use
→ Another app is using port 5000 or 5173. Close other dev servers or change the port in `backend/.env`.

---

## 📁 Project Structure

```
smartlib/
├── backend/              # Node.js + Express API server
│   ├── models/           # Mongoose models (User, Book, Issue, etc.)
│   ├── routes/           # API route handlers
│   ├── server.js         # Entry point
│   ├── db.js             # Database connection logic
│   ├── mongoConfig.js    # MongoDB URI helpers
│   ├── seed.js           # Database seeder script
│   ├── .env              # ⚠️ NOT committed — create from .env.example
│   └── .env.example      # Template for environment variables
├── react/                # React + Vite frontend
│   └── src/              # React source files
└── package.json          # Root scripts (runs both together)
```

---

## 🔒 Security Notes

- The `.env` file is **gitignored** and will never be pushed to GitHub.
- Always use environment variables for secrets — never hardcode credentials.
- For production, restrict Atlas Network Access to your server's specific IP.
