# 📚 SmartLib - Library Management System

A full-stack library management system built with React, Node.js, Express, and MongoDB.

---

## ⚙️ Prerequisites (Install These First)

Before running this project, make sure you have the following installed:

1. **Node.js** (v18 or higher) → https://nodejs.org/
2. **MongoDB Community Server** → https://www.mongodb.com/try/download/community
   - After installing, make sure **MongoDB is running** on your machine.
   - On Windows: Search for "Services" → Find "MongoDB" → Click Start
   - Or run in terminal: `net start MongoDB`

---

## 🚀 Setup & Run (Step by Step)

Open a terminal (PowerShell or Command Prompt) in the project folder and run these commands **in order**:

### Step 1 — Install Root Dependencies
```bash
npm install
```

### Step 2 — Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 3 — Install Frontend Dependencies
```bash
cd react
npm install
cd ..
```

### Step 4 — Seed the Database (First Time Only)
This creates initial admin/librarian/student accounts:
```bash
npm run seed
```

### Step 5 — Start the Application
```bash
npm start
```

This will start both the backend server and the React frontend simultaneously.

---

## 🌐 Access the App

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:5000       |

---

## 🔑 Default Login Credentials (after seeding)

| Role      | Email                   | Password   |
|-----------|-------------------------|------------|
| Admin     | admin@smartlib.com      | admin123   |
| Librarian | librarian@smartlib.com  | lib123     |
| Faculty   | faculty@smartlib.com    | fac123     |
| Student   | student@smartlib.com    | stu123     |

> **Note:** Run `npm run seed` only once. Running it again may create duplicates.

---

## 🛠️ Troubleshooting

### ❌ "Server Error" or "Cannot connect to MongoDB"
→ MongoDB is not running. Start it:
- **Windows:** `net start MongoDB` in terminal (as Administrator)
- **Mac/Linux:** `sudo systemctl start mongod`

### ❌ "Cannot find module" errors
→ You skipped the `npm install` steps. Run Steps 1–3 above again.

### ❌ Port already in use
→ Another app is using port 5000 or 5173. Close other dev servers or change the port in `backend/.env`.

---

## 📁 Project Structure

```
lib/
├── backend/          # Node.js + Express API server
│   ├── models/       # MongoDB/Mongoose models
│   ├── routes/       # API route handlers
│   ├── server.js     # Entry point
│   ├── db.js         # Database connection
│   └── .env          # Environment config (PORT, DB URL, JWT secret)
├── react/            # React + Vite frontend
│   └── src/          # React source files
└── package.json      # Root scripts (runs both together)
```
