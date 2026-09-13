# 🎓 EDUTrack AI Pro

> Next-Generation Academic Operating System with AI-Powered Insights & Real-Time ERP

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-indigo?style=for-the-badge&logo=github)](https://riishilmmehta.github.io/edutrack-ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%2B%20MongoDB-blue.svg)](https://mysql.com)

---

## 📋 Overview

**EDUTrack AI Pro** is an academic management platform (UMS / Campus ERP) designed for universities and higher-education institutions. It features:
- **Role-Based Portals:** Dedicated experiences for **Students**, **Faculty/Teachers**, **Administrators**, and **Finance/Accountants**.
- **Unified Academic Operations:** Attendance tracking, curriculum progress, automated grading, and fee payments.
- **Hybrid Architecture:** Relational academic core in MySQL, high-volume event/notification streams in MongoDB, with an interactive single-page frontend.

---

## 📂 Project Structure

```
edutrack-ai/
├── index.html               # Production Frontend (SPA, React 18, Chart.js, Tailwind/Custom UI)
├── requirements.txt         # Python AI/Analytics utility dependencies
├── README.md                # Main documentation
├── server/                  # Production Backend (Express.js)
│   ├── config/              # MySQL & MongoDB pool connections
│   ├── controllers/         # Auth, Attendance, Grades, Fees controllers
│   ├── database/
│   │   ├── schema.sql       # Relational MySQL table schema
│   │   └── seed.sql         # Seed data & demo accounts
│   ├── middleware/          # JWT authentication & role-based route guards
│   ├── models/              # MongoDB models (Notifications, Activity logs)
│   ├── routes/              # Express API route declarations
│   ├── utils/               # Credential generation, Audit log writing
│   ├── docker-compose.yml   # One-command local MySQL + MongoDB setup
│   ├── .env.example         # Environment template
│   ├── package.json         # Backend dependencies
│   └── server.js            # Server entry point
```

---

## 🚀 Quick Start

### 1. Run the Frontend
Simply open `index.html` in your browser, or visit the live deployment at:  
👉 **[https://riishilmmehta.github.io/edutrack-ai/](https://riishilmmehta.github.io/edutrack-ai/)**

### 2. Start the Backend Server

```bash
cd server
npm install
cp .env.example .env
```

Fill in your `.env` credentials (or use the defaults with Docker).

#### Launch Databases with Docker (Optional):
```bash
docker compose up -d
```
This initializes:
- MySQL on port `3306` with `edutrack_db` (pre-seeded with demo accounts).
- MongoDB on port `27017`.

#### Start Express Server:
```bash
npm run dev     # Development mode with nodemon
# or
npm start       # Production node server
```

The backend starts at `http://localhost:3000`. Test via:
```bash
curl http://localhost:3000/api/health
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Portal / Description |
|---|---|---|---|
| **Admin** | `admin@edutrack.edu` | `password` | System Administration & Account Approvals |
| **Teacher** | `priya@edutrack.edu` | `password` | Faculty Dashboard, Attendance & Grading |
| **Accountant** | `accountant@edutrack.edu` | `password` | Bursar & Fee Management Panel |
| **Student** | `aaravshah@vidhyadham.edu` | `GR2026036` | Student Academic Portal |

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `POST /api/auth/register` — Public registration (sets status to `PENDING`).
- `POST /api/auth/register/admin` — Admin user creation (sets status to `ACTIVE`).
- `POST /api/auth/change-password` — Change password (clears `must_change_password`).
- `GET /api/auth/users/pending` — [Admin] List self-registered accounts awaiting review.
- `PATCH /api/auth/users/:id/status` — [Admin] Approve, suspend, or reject an account.

### Attendance (`/api/attendance`)
- `POST /api/attendance/mark` — [Teacher/Admin] Record attendance for students.
- `GET /api/attendance` — Query attendance history with filters (`studentId`, `classId`, `courseId`).
- `GET /api/attendance/stats/:studentId` — Attendance percentage, present/absent counts.

### Academic Grades (`/api/grades`)
- `POST /api/grades` — [Teacher/Admin] Record/publish grades (triggers MongoDB notification).
- `GET /api/grades` — View student grade transcripts.

### Fees & Billing (`/api/fees`)
- `GET /api/fees` — View student fee schedules and pending dues.
- `POST /api/fees/pay` — [Accountant/Admin] Record a fee transaction with receipt reference.
- `POST /api/fees/waive` — [Accountant/Admin] Apply fee waiver with audit tracking.

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Fetch user's notification feed.
- `PATCH /api/notifications/:id/read` — Mark notification as read.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
