# 🎓 Academic Nexus — Full Stack Academic Course & Assignment Management Platform

> **Full Stack Production & Deployment Ready Architecture**  
> A full-stack academic SaaS platform built with **React.js + Tailwind CSS**, **Node.js + Express.js**, and a normalized **PostgreSQL** relational database. Features **JWT role-based authorization**, **individual & group assignment workflows**, server-enforced **group leader acknowledgment verification**, and faculty submission monitoring with real-time progress indicators.

---

## 📋 Table of Contents
1. [Production Architecture](#-production-architecture)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Demo Accounts & Test Credentials](#-demo-accounts--test-credentials)
5. [Database Schema & Structure](#-database-schema--structure)
6. [The Group Acknowledgment Workflow](#-the-group-acknowledgment-workflow)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Local Development Setup](#-local-development-setup)
9. [Database Setup & Seeding](#-database-setup--seeding)
10. [Production Deployment Guide](#-production-deployment-guide)
    - [Step 1: PostgreSQL Setup (Neon / Supabase / Render)](#step-1-postgresql-setup-neon--supabase--render)
    - [Step 2: Backend Deployment (Render / Railway)](#step-2-backend-deployment-render--railway)
    - [Step 3: Frontend Deployment (Vercel / Netlify)](#step-3-frontend-deployment-vercel--netlify)
11. [API Documentation](#-api-documentation)
12. [Verification & Testing](#-verification--testing)

---

## 🏗️ Production Architecture

```mermaid
flowchart LR
    subgraph Client ["Frontend (Vercel / Netlify)"]
        UI["React 18 + Vite + Tailwind CSS"]
        SPA["Client-side Router (vercel.json / netlify.toml)"]
        API_CLIENT["Central API Service (VITE_API_URL)"]
    end

    subgraph Server ["Backend (Render / Railway)"]
        EXPRESS["Node.js + Express.js"]
        AUTH["JWT Middleware (Bearer Auth)"]
        CORS_GUARD["CORS Security (FRONTEND_URL Whitelist)"]
        ROUTERS["API Routes & Controllers"]
        POOL["PostgreSQL Connection Pool (pg.Pool)"]
    end

    subgraph CloudDB ["Database (Neon / Supabase / Render)"]
        POSTGRES[("PostgreSQL Relational Database")]
        TABLES["Users, Courses, Enrollments, Assignments, Groups, Submissions"]
    end

    UI --> API_CLIENT
    API_CLIENT -- "HTTPS (Authorization: Bearer <token>)" --> CORS_GUARD
    CORS_GUARD --> EXPRESS
    EXPRESS --> AUTH
    AUTH --> ROUTERS
    ROUTERS --> POOL
    POOL -- "Encrypted SSL / TLS Connection" --> POSTGRES
    POSTGRES --> TABLES
```

---

## 🌟 Key Features

### 🎓 For Students:
- **Interactive Student Dashboard**: Live academic progress overview, enrolled course cards with completion progress bars, upcoming deadline countdowns, and quick access to assignments.
- **Course Exploration & Syllabi**: Course details, instructor metadata, course class roster, and filterable assignment timeline.
- **Individual Deliverable Submissions**: Clean submission portal supporting project repository links, execution notes, and evaluation status tracking.
- **Collaborative Group Workspaces**:
  - Automatic team discovery with **Group Leader (👑)** and **Member (👤)** designations.
  - Team member roster with avatars and role badges.
  - **Leader-Only Acknowledgment Verification**: Only the group leader can officially acknowledge submission receipt; the verified status is immediately synchronized across every member's view directly from PostgreSQL.
- **Faculty Evaluation Viewer**: Access grades and constructive faculty feedback upon evaluation.

### 👨‍🏫 For Professors:
- **Comprehensive Faculty Dashboard**: High-level academic analytics (total enrolled students, active assignments, total submissions received, acknowledgment rates).
- **Curriculum & Course Management**: Create and manage courses with custom course codes, descriptions, and academic semesters.
- **Assignment Publisher**: Publish individual or collaborative group assignments with custom deadlines, max scores, and guidelines.
- **Real-Time Submissions Monitor**:
  - Filter submissions by status (`ALL`, `SUBMITTED`, `ACKNOWLEDGED`, `PENDING`, `OVERDUE`).
  - View individual students or group entities with leader & member cards.
  - Review deliverable links and notes in modal dialogs.
  - Enter numeric grades and detailed feedback.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM v6, Lucide Icons |
| **Backend** | Node.js, Express.js, `pg` (PostgreSQL Connection Pooling), JWT (`jsonwebtoken`), `bcryptjs`, `cors`, `morgan` |
| **Database** | PostgreSQL with strict foreign keys, composite indexes, and ACID guarantees |
| **Deployment Targets** | **Frontend**: Vercel / Netlify \| **Backend**: Render / Railway \| **Database**: Neon / Supabase / Render PostgreSQL |

---

## 👥 Demo Accounts & Test Credentials

> [!NOTE]
> Demonstration credentials for evaluation and testing.

| Role | Name | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **👨‍🏫 Professor** | Dr. Robert Davis | `robert@university.edu` | `Password123!` | Manages CS-301 & CS-402, creates assignments, monitors submissions & evaluates grades |
| **👨‍🏫 Professor** | Prof. Elena Vance | `elena@university.edu` | `Password123!` | Manages CS-305, creates cloud-native assignments |
| **👑 Student (Leader)** | Rahul Sharma | `rahul@university.edu` | `Password123!` | Leader of *Alpha Tech Innovators*; has authority to acknowledge team submissions |
| **👤 Student (Member)** | Alex Chen | `alex@university.edu` | `Password123!` | Member of *Alpha Tech Innovators*; observes shared submission and synchronized acknowledgment |
| **👤 Student (Member)** | Priya Patel | `priya@university.edu` | `Password123!` | Member of *Alpha Tech Innovators*; submits individual assignments and observes team status |
| **👤 Student (Solo)** | Marcus Brown | `marcus@university.edu` | `Password123!` | Enrolled in CS-301 & CS-402; submits individual milestones |

---

## 📊 Database Schema & Structure

```
                  ┌──────────────────────┐
                  │        USERS         │
                  │──────────────────────│
                  │ id (PK)              │
                  │ name, email, role    │
                  │ password_hash        │
                  └──────────┬───────────┘
                             │ 1:N
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
┌───────────────┐                         ┌───────────────┐
│    COURSES    │                         │  ENROLLMENTS  │
│───────────────│                         │───────────────│
│ id (PK)       │                         │ id (PK)       │
│ code, name    │                         │ course_id(FK) │
│ professor_id  │                         │ student_id(FK)│
└───────┬───────┘                         └───────────────┘
        │ 1:N
        ▼
┌───────────────┐                         ┌───────────────┐
│  ASSIGNMENTS  │ 1:N                     │    GROUPS     │
│───────────────│────────────────────────►│───────────────│
│ id (PK)       │                         │ id (PK)       │
│ course_id(FK) │                         │ assignment_id │
│ title, type   │                         │ leader_id(FK) │
│ deadline      │                         └───────┬───────┘
└───────┬───────┘                                 │ 1:N
        │                                         ▼
        │                                 ┌───────────────┐
        │                                 │ GROUP_MEMBERS │
        │                                 │───────────────│
        │                                 │ group_id (FK) │
        │                                 │ student_id(FK)│
        │ 1:N                             └───────────────┘
        ▼
┌─────────────────────────────────────────────────────────┐
│                       SUBMISSIONS                       │
│─────────────────────────────────────────────────────────│
│ id (PK)                                                 │
│ assignment_id (FK)                                      │
│ student_id (FK, nullable for group)                     │
│ group_id (FK, nullable for individual)                  │
│ submission_text, submission_url                         │
│ status ('PENDING', 'SUBMITTED', 'ACKNOWLEDGED')         │
│ submitted_at, acknowledged_at, acknowledged_by (FK)     │
│ grade, feedback                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 The Group Acknowledgment Workflow

1. **Submission Initiated**: A student member or leader of a group submits project details (`submission_text`, `submission_url`). The database updates `status = 'SUBMITTED'`.
2. **Member Access**: Group member Alex Chen navigates to the assignment. Alex sees the shared group submission, with `status = 'SUBMITTED'`.
3. **Unauthorized Attempt Blocked**: If Alex attempts to acknowledge the submission, the backend interceptor detects `user.id !== group.leader_id` and rejects the request with **`403 Forbidden`**.
4. **Leader Acknowledgment**: Group leader Rahul Sharma clicks **"Acknowledge Submission"**. The backend verifies leader identity and executes:
   ```sql
   UPDATE submissions 
   SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1 
   WHERE id = $2
   ```
5. **Instant State Reflection**:
   - Rahul's screen reflects **`ACKNOWLEDGED`** with green status badge and leader timestamp.
   - Alex and Priya refresh/visit the page and immediately see **`ACKNOWLEDGED`** verified by Leader Rahul.
   - Professor Robert Davis opens the **Submissions Monitor** and views the submission marked as **`ACKNOWLEDGED`**.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `development` | Runtime environment (`development` or `production`) | `production` |
| `PORT` | No | `5000` | Port for Express HTTP server (assigned dynamically on Render/Railway) | `5000` |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string (supports SSL/cloud providers) | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | **Yes** | - | Cryptographic secret for signing and verifying JWT tokens | `min_32_chars_random_string_secret` |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration lifespan | `7d` |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | Allowed CORS origin(s) (supports comma-separated URLs) | `https://academic-nexus.vercel.app` |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | `/api` | Base URL of the backend API | `https://academic-nexus-api.onrender.com/api` |

> [!IMPORTANT]
> Never commit `.env` files to source control. Only `.env.example` templates are tracked in git.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL running locally or a free cloud instance (e.g. Neon / Supabase)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd joineasy-task-2

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Local Environment Variables
Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academic_nexus
JWT_SECRET=dev_academic_nexus_jwt_secret_key_2026
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Initialize & Seed Database
```bash
# From root directory:
npm run db:setup

# Or from backend directory:
npm run db:migrate
npm run db:seed
```

### 4. Run Development Servers
```bash
# Terminal 1 - Backend:
cd backend
npm run dev

# Terminal 2 - Frontend:
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser!

---

## 🗄️ Database Setup & Seeding

The application provides dedicated, idempotent CLI scripts to manage the PostgreSQL schema:

- **Apply Schema**: `npm run db:migrate` (Executes `backend/src/db/schema.sql`)
- **Seed Demo Data**: `npm run db:seed` (Seeds professors, students, courses, assignments, groups, and submissions)
- **Full Database Setup**: `npm run db:setup` (Runs migration followed by seeding)

---

## 🚀 Production Deployment Guide

### Step 1: PostgreSQL Setup (Neon / Supabase / Render)

1. Create a free PostgreSQL instance on **[Neon.tech](https://neon.tech)**, **[Supabase](https://supabase.com)**, or **[Render](https://render.com)**.
2. Copy your connection string (`DATABASE_URL`), ensuring it contains `sslmode=require`.
   - Example: `postgresql://neondb_owner:npg_password@ep-cool-cloud.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Run migrations on your cloud database from your terminal:
   ```bash
   DATABASE_URL="your-neon-database-url" npm --prefix backend run db:migrate
   DATABASE_URL="your-neon-database-url" npm --prefix backend run db:seed
   ```

---

### Step 2: Backend Deployment (Render / Railway)

#### Deploying on Render:
1. Sign in to **[Render.com](https://render.com)** and click **New + > Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `academic-nexus-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://...your-cloud-db-url...`
   - `JWT_SECRET`: *(Generate a secure random string of 32+ characters)*
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app` *(or `https://your-frontend-app.netlify.app`)*
5. Click **Create Web Service**.
6. Verify your backend deployment by visiting:
   ```
   https://academic-nexus-backend.onrender.com/api/health
   ```
   **Expected Response:**
   ```json
   {
     "success": true,
     "message": "API is running",
     "database": "connected",
     "timestamp": "2026-09-21T18:30:00.000Z"
   }
   ```

---

### Step 3: Frontend Deployment (Vercel / Netlify)

#### Deploying on Vercel:
1. Sign in to **[Vercel.com](https://vercel.com)** and click **Add New > Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://academic-nexus-backend.onrender.com/api`
5. Click **Deploy**.
6. *(SPA routing is automatically configured via `frontend/vercel.json`)*.

#### Deploying on Netlify:
1. Sign in to **[Netlify.com](https://netlify.com)** and choose **Add new site > Import an existing project**.
2. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://academic-nexus-backend.onrender.com/api`
4. Click **Deploy Site**.
5. *(SPA routing is automatically configured via `frontend/netlify.toml` and `frontend/public/_redirects`)*.

---

## 📡 API Documentation

### Public & Health Endpoints
- `GET /api/health` — Returns service health and PostgreSQL connectivity status (No auth required).
- `POST /api/auth/register` — Register a new student or professor account.
- `POST /api/auth/login` — Authenticate and receive signed JWT token.

### Protected Endpoints (`Authorization: Bearer <token>`)
- `GET /api/auth/me` — Retrieve authenticated user profile.
- `GET /api/courses` — Get courses tailored to caller role (Enrolled courses for students, created courses with metrics for professors).
- `GET /api/courses/:id` — Detailed course syllabus, enrolled roster, and assignments.
- `POST /api/courses` — Create a new course *(Professor only)*.
- `POST /api/courses/:id/enroll` — Enroll in a course *(Student only)*.
- `GET /api/assignments` — Filterable assignments by course or submission type (`INDIVIDUAL` / `GROUP`).
- `GET /api/assignments/:id` — Assignment details and student submission state.
- `POST /api/assignments` — Publish new assignment *(Professor only)*.
- `POST /api/assignments/:id/submit` — Submit individual or group assignment deliverable.
- `POST /api/submissions/:id/acknowledge` — Officially acknowledge submission receipt *(Server-enforced: Only the group leader or student author can execute)*.
- `GET /api/assignments/:id/submissions` — Real-time submissions monitor *(Professor only)*.
- `POST /api/submissions/:id/grade` — Assign score and feedback to submission *(Professor only)*.

---

## 🧪 Verification & Testing

### 1. Build Verification
```bash
cd frontend
npm run build
```
*Expected: Flawless production bundle output in `frontend/dist`.*

### 2. Automated Production Integration & Security Suite
```bash
cd backend
node src/test/production_check.js
```
*Expected: 100% assertions passed for `/api/health`, preflight CORS, role-based 401/403 security, and 404 handlers.*
