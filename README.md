# Human Firewall — Cybersecurity Awareness Platform

A full-stack enterprise SaaS platform for **phishing simulation**, **security awareness training**, **real-time risk scoring**, and **admin SOC dashboards**. Built with React 19, Express.js, PostgreSQL, and an optional Chrome extension.

---

## Project Structure

```
demo human firewall/
├── backend/          # Express.js API + PostgreSQL (v3.0.0)
│   ├── db/
│   │   ├── schema.sql   # 20 tables + views
│   │   └── seed.js      # Full synthetic dataset seeder
│   └── routes/          # REST API endpoints
├── frontend/         # React 19 + Vite SPA
└── extention/        # Chrome MV3 email scanner (optional)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v18+ |
| PostgreSQL | v14+ |
| npm | v9+ |

---

## Quick Start

### 1. Create the database (one-time)

```powershell
psql -U postgres -c "CREATE DATABASE awareguard;"
```

### 2. Configure environment

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=awareguard
JWT_SECRET=supersecret
PORT=5000
NODE_ENV=development
```

### 3. Install dependencies & seed the database

```powershell
cd "demo human firewall/backend"
npm install
node db/seed.js
```

The seed script will:
- Rebuild all 20 database tables
- Create **Demo Corp** with 10 departments
- Seed **71 employees** (1 admin + 5 demo profiles + 65 synthetic)
- Create **15 training courses** with multi-slide lessons and quizzes
- Create **90+ phishing templates** (phishing + legitimate emails)
- Assign **25+ inbox emails per employee** with historical actions
- Generate risk history, badges, and security activity logs

### 4. Start the backend

```powershell
cd "demo human firewall/backend"
npm run dev
```

API health check: http://localhost:5000/api/health

### 5. Start the frontend

```powershell
cd "demo human firewall/frontend"
npm install
npm run dev
```

App: http://localhost:5173

---

## Demo Login Credentials

| Profile | Email | Password | Risk Level |
|---------|-------|----------|------------|
| **Admin** | admin@company.com | admin123 | Very Secure |
| **High Risk** | highrisk@company.com | password123 | Critical (88) |
| **Medium Risk** | mediumrisk@company.com | password123 | Moderate (52) |
| **Low Risk** | lowrisk@company.com | password123 | Very Secure (18) |
| **Highly Trained** | highlytrained@company.com | password123 | Very Secure (8) |
| **Beginner** | beginner@company.com | password123 | Low Risk (40) |

Use the **Quick Demo Access** buttons on the login page for one-click login.

---

## Features

### Admin SOC Dashboard (`/admin`)
- Organization overview: total employees, high/critical risk counts, avg risk
- Risk analytics charts: distribution, department breakdown, trends
- Searchable employee table with department/risk/training filters
- Employee security profile modal: phishing behavior, training stats, timeline
- Campaign management and user actions (trigger phishing, assign course, reset)

### Employee Dashboard (`/dashboard`)
- Security awareness score and risk level
- Training progress, XP, security streak
- Phishing performance metrics
- Recent activity feed and risk trend chart

### Phishing Simulation Inbox (`/phishing`)
- **25+ personalized emails** per employee
- Mix of **phishing simulations** and **legitimate emails**
- Difficulty levels: Beginner → Expert
- Actions: Report Phishing, Mark as Safe, Click Link, Ignore
- Immediate feedback with red flag explanations
- Risk score updates on every action

### Training Platform (`/training`)
- **15 cybersecurity courses** with 3–4 slides each
- Interactive knowledge check quizzes (70% pass required)
- XP rewards, badges, and completion tracking
- Courses: Phishing, Social Engineering, MFA, BEC, AI Phishing, Deepfakes, and more

### Attack Scenarios (`/scenarios`)
- Interactive browser-based attack scenario explorer

### Chrome Extension (optional)
1. Open `chrome://extensions` → Enable Developer Mode
2. Load unpacked → select `extention/` folder
3. Requires backend running on port 5000

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Register employee |
| GET | `/api/dashboard/:userId` | Employee dashboard data |
| GET | `/api/phishing/emails?userId=` | Per-user inbox |
| GET | `/api/phishing/emails/:id` | Email detail |
| POST | `/api/phishing/action` | Record email action |
| GET | `/api/training/lessons` | List courses |
| GET | `/api/training/lessons/:id` | Lesson slides |
| GET | `/api/training/lessons/:id/quiz` | Quiz questions |
| POST | `/api/training/complete` | Mark lesson complete |
| POST | `/api/training/quiz` | Submit quiz answers |
| GET | `/api/behavior/:userId` | Behavior metrics |
| GET | `/api/admin/overview` | Admin org stats |
| GET | `/api/admin/users` | Employee list |
| GET | `/api/admin/users/:id/profile` | Employee profile |
| POST | `/api/analyze-email` | Chrome extension scan |

---

## Database Schema (20 Tables)

`organizations`, `departments`, `users`, `campaigns`, `phishing_templates`, `phishing_simulations`, `phishing_events`, `email_logs`, `risk_scores`, `risk_events`, `training_courses`, `training_modules`, `training_lessons`, `training_questions`, `training_attempts`, `employee_training_progress`, `badges`, `employee_badges`, `security_activity`, `org_scan_summary` (view)

---

## Risk Score Formula

Risk is calculated deterministically from behavior (0–100):

```
Base 40
+ Phishing clicks × 30
+ Ignored/missed simulations × 10
+ Credential submission attempts × 40
− Correct phishing reports × 15
− Training courses completed × 10
− Successful quizzes × 5
```

| Score | Level |
|-------|-------|
| 0–20 | Very Secure |
| 21–40 | Low Risk |
| 41–60 | Moderate Risk |
| 61–80 | High Risk |
| 81–100 | Critical |

---

## Reset Demo Data

```powershell
cd "demo human firewall/backend"
node db/seed.js
```

> **Warning:** This drops and recreates all tables. All live data will be lost.

---

## Architecture

```
Browser (React 19 + Vite :5173)
    ↕  /api/* (Vite proxy → localhost:5000)
Express.js Backend (Node.js :5000)
    ↕
PostgreSQL (awareguard database)
    +
Chrome Extension → POST /api/analyze-email
```

**Authentication:** JWT tokens in `localStorage`. Admin routes require `role: admin`.

**Real-time refresh:** Dashboard and Admin panel poll every 3 seconds.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check PostgreSQL is running; verify `backend/.env` credentials |
| `password authentication failed` | Update `DB_PASSWORD` in `.env` |
| Login fails with demo accounts | Re-run `node db/seed.js` to reset accounts |
| Empty phishing inbox | Re-run seed; inbox is populated per-user during seeding |
| Frontend can't reach API | Ensure backend is on port 5000; check Vite proxy in `vite.config.js` |
| Port in use | Change `PORT` in `.env` or let Vite auto-select next port |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7, Recharts, Framer Motion, Lucide |
| Backend | Node.js, Express 5, JWT, bcryptjs, pg |
| Database | PostgreSQL 14+ |
| Extension | Chrome MV3 (Vanilla JS) |
| Styling | Vanilla CSS (dark SOC theme) |

---

## Security Notes

This is a **defensive cybersecurity awareness platform**:
- All phishing content is synthetic with fictional `.test` domains
- No real credentials are collected
- No real emails are sent
- Safe simulation URLs only — for training purposes

---

## Remaining Limitations

- Chrome extension icons are not bundled (remove icon refs from manifest or add PNGs)
- Some employee API routes lack JWT auth (demo environment)
- Campaign creation UI is partially implemented in admin panel
- New sign-up users get an empty inbox until admin triggers a campaign or they interact with fallback seeding
