# 🛡️ Human Firewall — Cybersecurity Awareness Platform

A full-stack SaaS platform for employee phishing simulation, security training, and real-time risk monitoring. Includes a Chrome Extension, Express.js backend, PostgreSQL database, and a React frontend.

---

## 📁 Project Structure

```
demo human firewall/
├── backend/          # Express.js API server (Node.js + PostgreSQL)
├── frontend/         # React + Vite SPA
└── extention/        # Chrome Extension (email scanner)
```

---

## ✅ Prerequisites

Make sure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| PostgreSQL | v14+ | https://www.postgresql.org/download |
| npm | v9+ | comes with Node.js |

---

## 🗄️ Database Setup (one-time)

### 1. Start PostgreSQL

Make sure PostgreSQL is running on your machine (default port `5432`).

### 2. Configure Environment

The `.env` file in `backend/` is already configured. Open it to verify:

```
backend/.env
```

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=marshall
DB_NAME=awareguard
JWT_SECRET=supersecret
PORT=5000
NODE_ENV=development
```

> Change `DB_PASSWORD` to your actual PostgreSQL password if different.

### 3. Create the Database & Seed Data

```powershell
cd "demo human firewall/backend"
npm install
node db/seed.js
```

This will:
- Create all tables (users, organizations, email_logs, risk_events)
- Seed the demo organization
- Create 4 demo accounts

---

## 🚀 Running the Application

Open **two terminals**.

### Terminal 1 — Backend

```powershell
cd "demo human firewall/backend"
npm run dev
```

→ API available at: `http://localhost:5000/api/health`

### Terminal 2 — Frontend

```powershell
cd "demo human firewall/frontend"
npm install
npm run dev
```

→ App available at: `http://localhost:5173`

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@company.com | admin123 |
| **Employee** | alice@company.com | password123 |
| **Employee** | bob@company.com | password123 |
| **Employee** | carol@company.com | password123 |

---

## 👤 User Roles & Access

### Employee
After **Sign Up** or **Sign In** as an employee, you get access to:

| Page | URL | Description |
|------|-----|-------------|
| **Dashboard** | `/dashboard` | Personal risk score, training progress, activity feed |
| **Phishing Inbox** | `/phishing` | Simulated phishing email inbox |
| **Email Viewer** | `/phishing/:id` | Open and respond to simulation emails |
| **Training** | `/training` | Security lessons with XP rewards |
| **Lesson** | `/training/:id` | Slide-by-slide lesson viewer |
| **Attack Scenarios** | `/scenarios` | Interactive attack scenario explorer |

### Admin
Sign in as `admin@company.com` to also access:

| Page | URL | Description |
|------|-----|-------------|
| **Admin Panel** | `/admin` | Org-wide risk scores, employee stats, user management |
| **All employee pages** | — | Admins can view dashboard and all other pages |

> **New users who sign up are always assigned the `employee` role.**

---

## 🔄 Real-Time Data

The Dashboard and Admin Panel automatically refresh data every **3 seconds** without any page reload. This keeps all metrics in sync as employees interact with the platform.

---

## 🌐 Chrome Extension (optional)

The Chrome Extension scans real emails in Gmail/Outlook and sends them to the backend for phishing analysis.

### Load the extension:
1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `demo human firewall/extention/` folder

> The extension connects to `http://localhost:5000/api/analyze-email`. Make sure the backend is running.

---

## 🏗️ Architecture Overview

```
Browser (React + Vite)
    ↕  /api/* (Vite proxy → localhost:5000)
Express.js Backend (Node.js)
    ↕
PostgreSQL (users, orgs, email_logs, risk_events)
    +
In-memory mock data (phishing emails, training lessons, behavior records)
```

**Authentication:** JWT tokens stored in `localStorage`. All protected routes require `Authorization: Bearer <token>`.

**Behavior Data:** Phishing actions and training progress are stored in-memory (mock data) and work for all users including newly signed-up ones. Risk scores update in real-time as users interact with the platform.

---

## 🛠️ Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify `backend/.env` credentials match your PostgreSQL setup
- Run `node db/seed.js` to ensure the database is initialized

### Frontend shows "Failed to load dashboard"
- Make sure the backend is running on port `5000`
- Check browser console for errors
- Verify you are logged in (token in localStorage)

### "password authentication failed for user postgres"
- Update `DB_PASSWORD` in `backend/.env` to match your PostgreSQL password

### Port already in use
- Backend: change `PORT=5000` in `.env`
- Frontend: Vite will automatically try the next port (5174, 5175...)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7, Recharts, Framer Motion |
| Backend | Node.js, Express 5, JWT, bcryptjs |
| Database | PostgreSQL 14+, node-postgres (pg) |
| Extension | Vanilla JS Chrome MV3 |
| Styling | Vanilla CSS (dark cyberpunk theme) |
