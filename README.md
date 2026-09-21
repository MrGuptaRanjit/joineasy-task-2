# 🎓 Academic Nexus — Full Stack Academic Course & Assignment Management Platform

> **Full Stack Round 2 Assignment Implementation**  
> A full-stack academic SaaS platform built with **React.js + Tailwind CSS**, **Node.js + Express.js**, and a normalized **PostgreSQL** relational database. Features robust **JWT role-based authorization**, **individual & group assignment workflows**, server-enforced **group leader acknowledgment reflection**, and faculty submission monitoring with real-time progress indicators.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Architecture & System Design](#-architecture--system-design)
5. [Database Schema & Relationships](#-database-schema--relationships)
6. [Authorization Matrix & Security](#-authorization-matrix--security)
7. [The Group Acknowledgment Workflow](#-the-group-acknowledgment-workflow)
8. [API Documentation](#-api-documentation)
9. [Demo Accounts & Test Credentials](#-demo-accounts--test-credentials)
10. [Local Development Setup](#-local-development-setup)
11. [Deployment Preparation](#-deployment-preparation)
12. [UI/UX Design Decisions](#-uiux-design-decisions)

---

## 🌟 Project Overview

**Academic Nexus** is designed to eliminate the friction in modern university coursework management. It provides dedicated role-tailored dashboards for both **Students** and **Professors**, addressing the complex realities of collaborative group coursework where submissions and official acknowledgments must be synchronized across team members and faculty in real-time without client-side state inconsistencies.

---

## 🚀 Key Features

### 🎓 For Students:
- **Interactive Student Dashboard**: Live academic progress overview, enrolled course cards with completion progress bars, upcoming deadline countdowns, and quick access to assignments.
- **Course Exploration & Syllabi**: Course details, instructor metadata, course class roster, and filterable assignment timeline.
- **Individual Deliverable Submissions**: Clean submission portal supporting project repository links, execution notes, and evaluation status tracking.
- **Collaborative Group Workspaces**:
  - Automatic team discovery with **Group Leader (👑)** and **Member** designations.
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
| **Frontend** | React 18, Tailwind CSS, React Router DOM v6, Lucide Icons, Vite |
| **Backend** | Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, `cors`, `morgan` |
| **Database** | PostgreSQL (`pg` pool with parameterized SQL, transactions, foreign key constraints), Embedded dual-mode engine |
| **Tooling** | Automated E2E test suites, PostCSS, Autoprefixer |

---

## 🏗️ Architecture & System Design

```
joineasy-task-2/
├── backend/
│   ├── src/
│   │   ├── config/ (env.js)
│   │   ├── controllers/ (authController, courseController, assignmentController, submissionController, groupController)
│   │   ├── middleware/ (auth.js, errorHandler.js)
│   │   ├── routes/ (authRoutes, courseRoutes, assignmentRoutes, submissionRoutes, groupRoutes)
│   │   ├── db/ (schema.sql, seed.js, dbClient.js)
│   │   ├── test/ (api.test.js, e2e_simulation.js)
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/ (Navbar, Sidebar, StatusBadge, ProgressBar, StatCard, Skeleton, EmptyState, Modal)
│   │   │   ├── layout/ (AppLayout, ProtectedRoute)
│   │   │   ├── courses/ (CreateCourseModal)
│   │   │   └── assignments/ (CreateAssignmentModal)
│   │   ├── context/ (AuthContext.jsx, ToastContext.jsx)
│   │   ├── pages/ (Login, Register, StudentDashboard, ProfessorDashboard, CourseDetails, CoursesList, AssignmentDetails, AssignmentsList, SubmissionsMonitor)
│   │   ├── services/ (api.js)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── package.json (root orchestration)
└── README.md
```

---

## 🗄️ Database Schema & Relationships

```mermaid
erDiagram
    users ||--o{ courses : "teaches"
    users ||--o{ course_enrollments : "enrolls"
    users ||--o{ submissions : "submits"
    users ||--o{ groups : "leads"
    users ||--o{ group_members : "belongs"
    courses ||--o{ course_enrollments : "has"
    courses ||--o{ assignments : "contains"
    assignments ||--o{ submissions : "receives"
    assignments ||--o{ groups : "organizes"
    groups ||--o{ group_members : "includes"
    groups ||--o{ submissions : "submits"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        string role "STUDENT | PROFESSOR"
        string avatar_url
        datetime created_at
    }

    courses {
        int id PK
        string code UK
        string name
        text description
        string semester
        int professor_id FK
        datetime created_at
    }

    course_enrollments {
        int id PK
        int course_id FK
        int student_id FK
        datetime enrolled_at
    }

    assignments {
        int id PK
        int course_id FK
        string title
        text description
        datetime deadline
        string submission_type "INDIVIDUAL | GROUP"
        int max_score
        int created_by FK
        datetime created_at
        datetime updated_at
    }

    groups {
        int id PK
        int assignment_id FK
        string name
        int leader_id FK
        datetime created_at
    }

    group_members {
        int id PK
        int group_id FK
        int student_id FK
        datetime joined_at
    }

    submissions {
        int id PK
        int assignment_id FK
        int student_id FK "nullable"
        int group_id FK "nullable"
        text submission_text
        string submission_url
        string status "PENDING | SUBMITTED | ACKNOWLEDGED | OVERDUE"
        datetime submitted_at
        datetime acknowledged_at
        int acknowledged_by FK
        int grade
        text feedback
        datetime created_at
        datetime updated_at
    }
```

---

## 🛡️ Authorization Matrix & Security

| Operation | Student (Leader) | Student (Member) | Professor (Course Owner) |
| :--- | :---: | :---: | :---: |
| **View Student Dashboard & Enrolled Courses** | ✅ | ✅ | ❌ |
| **View Professor Dashboard & Courses Taught** | ❌ | ❌ | ✅ |
| **Create / Edit / Delete Course or Assignment** | ❌ | ❌ | ✅ |
| **Submit Individual Assignment** | ✅ | ✅ | ❌ |
| **Submit Group Assignment for Team** | ✅ | ✅ | ❌ |
| **Acknowledge Group Submission** | ✅ (Leader) | ❌ (403 Forbidden) | ✅ |
| **Monitor All Submissions & Award Grades** | ❌ | ❌ | ✅ |

### Security Measures:
1. **Role Verification**: Server-side middleware verifies user role from verified JWT payload and database queries. Never relies on client-submitted roles.
2. **Password Security**: Strong hashing with `bcryptjs` (salt rounds: 10). Passwords are never returned in API payloads.
3. **SQL Parameterization**: All SQL queries use parameterized arguments (`$1, $2, ...`) to eliminate SQL injection vulnerabilities.
4. **CORS & Token Expiry**: Configured CORS origins with configurable token lifetimes.

---

## 👑 The Group Acknowledgment Workflow

The platform enforces a strict, real-world academic protocol for collaborative group assignments:

```
[Team Member or Leader Submits Code]
                  │
                  ▼
   Database Status: "SUBMITTED"
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[Member Attempts Ack]   [Leader Clicks Ack]
        │                   │
  403 FORBIDDEN        200 SUCCESS
 (Backend Block)       (Database Updated)
                            │
                            ▼
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
 [All Group Members See]           [Professor Monitor Sees]
  "Acknowledged ✓ by Leader"        "Acknowledged ✓"
```

1. **Submission**: When either the leader or any team member submits code, the shared `submissions` record is marked as `SUBMITTED`.
2. **Leader Constraint**: If a regular group member calls `POST /api/submissions/:id/acknowledge`, the backend executes:
   ```js
   if (user.role !== 'PROFESSOR' && user.id !== sub.group_leader_id) {
     return res.status(403).json({
       success: false,
       message: `Forbidden: Only the group leader (${sub.leader_name}) has the authority to acknowledge this submission.`
     });
   }
   ```
3. **Shared State Reflection**: When the leader acknowledges, the shared submission in PostgreSQL is updated with `status = 'ACKNOWLEDGED'`, `acknowledged_at = NOW()`, and `acknowledged_by = leader_id`. When any member (Alex, Priya, etc.) or the professor loads the page, they immediately see the acknowledged status backed by the database.

---

## 🔑 Demo Accounts & Test Credentials

All accounts come pre-seeded with password: **`Password123!`**

| Name | Role | Email | Purpose / Testing Focus |
| :--- | :--- | :--- | :--- |
| **Rahul Sharma** | Student (👑 Leader) | `rahul@university.edu` | Can submit and acknowledge for group *Alpha Tech Innovators* |
| **Alex Chen** | Student (👤 Member) | `alex@university.edu` | Belongs to *Alpha Tech Innovators*. Cannot acknowledge, sees shared state |
| **Priya Patel** | Student (👤 Member) | `priya@university.edu` | Belongs to *Alpha Tech Innovators*. Verifies sync across all 3 members |
| **Marcus Brown** | Student (Solo) | `marcus@university.edu` | Individual submissions and leader of *Cloud Titans* |
| **Dr. Robert Davis** | 👨‍🏫 Professor | `robert@university.edu` | Teaches CS-301 & CS-402, monitors submissions and awards grades |
| **Prof. Elena Vance** | 👨‍🏫 Professor | `elena@university.edu` | Teaches CS-305 (Cloud Native Systems) |

> 💡 **Quick Switcher**: The frontend navigation bar includes a **"⚡ Switch Role"** dropdown that lets evaluators switch between accounts with a single click.

---

## 💻 Local Development Setup

### Prerequisites:
- **Node.js**: v18+ (tested on Node v20/v24)
- **npm**: v9+

### 1. Clone & Install Dependencies
```bash
# In the project root:
cd joineasy-task-2

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Seed Database
```bash
# Seed users, courses, assignments, groups, and initial submissions
cd ../backend
npm run seed
```

### 3. Run Automated Tests
```bash
# Runs full test suite verifying auth, permissions, and group acknowledgment
npm test
```

### 4. Start Backend Server
```bash
# Runs Express backend on http://localhost:5000
npm start
# (or npm run dev with nodemon)
```

### 5. Start Frontend Dev Server
```bash
# In another terminal:
cd ../frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 🌐 Environment Variables

### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=academic_nexus_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academic_nexus
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=/api
```

---

## 📡 API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new Student or Professor.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `GET /api/auth/demo-accounts` — List pre-seeded accounts for testing.

### Courses (`/api/courses`)
- `GET /api/courses` — List courses (enrolled courses for students, taught for professors).
- `GET /api/courses/:id` — Get course details with assignments and student roster.
- `POST /api/courses` — *(Professor only)* Create a new course.
- `POST /api/courses/:id/enroll` — *(Student only)* Enroll in a course.

### Assignments (`/api/assignments`)
- `GET /api/assignments` — List assignments (filterable by `courseId` and `submissionType`).
- `GET /api/assignments/:id` — Assignment details, group membership, and current submission status.
- `POST /api/assignments` — *(Professor only)* Create individual or group assignment.
- `PUT /api/assignments/:id` — *(Professor only)* Edit assignment.
- `DELETE /api/assignments/:id` — *(Professor only)* Delete assignment.

### Submissions & Acknowledgment (`/api/assignments` & `/api/submissions`)
- `POST /api/assignments/:id/submit` — *(Student only)* Submit individual work or team work.
- `GET /api/assignments/:id/submissions` — *(Professor only)* Monitoring table with computed stats.
- `POST /api/submissions/:id/acknowledge` — Acknowledge submission (**enforces group leader constraint**).
- `POST /api/submissions/:id/grade` — *(Professor only)* Enter numeric grade score and feedback.

### Groups (`/api/groups`)
- `GET /api/groups` — List groups for an assignment.
- `GET /api/groups/:id` — Get group members and team submission.
- `POST /api/groups` — Create new group with leader and members.
- `POST /api/groups/:id/members` — Add member to group.
- `DELETE /api/groups/:id/members/:studentId` — Remove member.

---

## 🎨 UI/UX Design Decisions

1. **Modern Academic Theme**:
   - Palette: Deep Slate (`slate-950`), vibrant Indigo (`#6366f1`) for students, rich Purple for faculty, Emerald for verifications, and Amber for leadership actions.
   - Glassmorphism: Frosted glass panels with subtle border highlights give a desktop-grade SaaS aesthetic.
2. **Visual Progress Indicators**:
   - Multi-step progress bars clearly indicate `Assigned` ➔ `Submitted` ➔ `Acknowledged`.
   - Dynamic badges give instant visual recognition of assignment states without reading lengthy text.
3. **Zero Dead Ends**:
   - Skeletons prevent layout shifting during asynchronous loads.
   - Clean empty states with actionable buttons guide users when no courses/assignments exist.
4. **Responsive Across All Viewports**:
   - Tested across mobile (320px–425px), tablet (768px), and desktop (1024px–1440px+).
   - Horizontal overflows are prevented; sidebars collapse into touch-friendly backdrop drawers.

---

## 🚀 Deployment Preparation

- **Frontend**: Fully compatible with Vercel or Netlify. Set `VITE_API_BASE_URL` to your production backend URL.
- **Backend**: Ready for Render, Railway, AWS ECS, or Fly.io. Point `DATABASE_URL` to any PostgreSQL database (Neon, Supabase, AWS RDS, Render PostgreSQL).

---

## 📄 Evaluation Checklist

- [x] React.js + Tailwind CSS frontend
- [x] Node.js + Express.js backend
- [x] PostgreSQL relational database with foreign keys & indexes
- [x] JWT Authentication & bcrypt password hashing
- [x] Student and Professor role authorization
- [x] Course & Assignment CRUD
- [x] Individual and Group assignment workflows
- [x] Leader-only group submission acknowledgment enforced on server
- [x] Shared acknowledgment reflected across all group members
- [x] Professor submission monitoring, filtering, and grading
- [x] Responsive UI (mobile, tablet, desktop)
- [x] Comprehensive seed data with one-click demo presets
- [x] Automated test suites with 100% pass rate
- [x] Deployment-ready architecture with `.env.example`
