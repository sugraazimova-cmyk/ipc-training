# IPC Training Platform — Complete Project Documentation

**Project:** IPC Training & Compliance Platform for Hospitals
**Status:** Planning → Phase 1 (Starting)
**Duration:** 12 weeks (estimated)
**Tech Stack:** React + Vite, Node.js + Vercel, Supabase (PostgreSQL)
**Location:** Azerbaijan

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Implementation Phases](#implementation-phases)
7. [Security & Compliance](#security--compliance)
8. [Decisions Made](#decisions-made)
9. [Testing & QA](#testing--qa)
10. [Deployment](#deployment)

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Vercel account (for serverless backend)
- GitHub repo

### Setup Commands
```bash
# Clone repo
git clone <repo-url>
cd ipc-training

# Frontend setup
npm install
vercel env pull  # Load .env.local from Vercel

# Start dev server (includes API)
vercel dev

# Run tests
npm run test

# Build for production
npm run build

# Deploy
vercel deploy --prod
```

### Environment Variables
```
# Frontend (.env.local or Vercel dashboard)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxx...
VITE_ADMIN_EMAIL=admin@hospital.az

# Backend (Vercel → Settings → Environment Variables)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxx...
ADMIN_EMAIL=admin@hospital.az
ANTHROPIC_API_KEY=sk-ant-... (optional, for future AI features)
```

---

## Project Overview

### What It Does
- **Users** (IPC doctors, nurses) register → get approved by admin → complete training modules
- **Modules** contain learning content (video, PDF, text) + pre-test & post-test
- **Tests** are MCQ (multiple-choice questions) with a pass threshold of 80%
- **Certificates** auto-issue when users pass the post-test
- **Admins** manage users, create modules, revoke certificates, audit all actions
- **Compliance:** Full audit trail for nationwide mandatory training

### Key Features (MVP)
✅ User registration & approval workflow
✅ Module + content management
✅ Pre/post tests with instant scoring
✅ Auto-generated PDF certificates
✅ User progress tracking
✅ Admin dashboard with audit log
✅ Hospital-level analytics
✅ Role-based access (doctor, nurse, admin)

### Out of Scope (Post-MVP)
- Mobile app
- Video streaming optimization (use CDN later)
- AI-powered content generation
- Multi-language (Azerbaijani only for MVP)
- Advanced analytics (heatmaps, cohort analysis)

---

## Architecture

### High-Level Flow

```
User Registration
       ↓
   Pending ← Admin Approval → Approved
       ↓
   Login & Dashboard
       ↓
   Select Module → View Content
       ↓
   Take Pre-Test (Pass/Fail)
       ↓
   (If Pass) Unlock Content
       ↓
   Take Post-Test (Pass/Fail)
       ↓
   (If Pass) Auto-Issue Certificate
       ↓
   Download Certificate or Retry
```

### System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 19 + Vite | User portal + admin dashboard |
| **Backend** | Node.js + Vercel Functions | API endpoints, auth, logic |
| **Database** | Supabase (PostgreSQL) | Users, modules, tests, certificates, audit trail |
| **Storage** | Supabase Storage | PDFs, videos, content files |
| **Auth** | Supabase Auth (JWT) | User login, session management |
| **Notifications** | Email (Supabase SMTP or SendGrid) | Optional for Phase 4 |

### Deployment Architecture

```
GitHub → Vercel (auto-deploy on push)
         ├─ Frontend: React app
         ├─ API: /api/* serverless functions
         └─ DB: Supabase (PostgreSQL)

vercel dev = Local Vite + Vercel functions + Supabase
```

---

## Database Schema

### Core Tables

#### `hospitals`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| name | TEXT | Hospital name |
| code | TEXT UNIQUE | Code (e.g., "HOSP001") |
| country | TEXT | "Azerbaijan" (future: multi-country) |
| created_at | TIMESTAMPTZ | |

#### `users`
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | From Supabase Auth |
| email | TEXT UNIQUE | |
| name | TEXT | |
| hospital_id | BIGINT FK | References hospitals |
| role | TEXT | 'doctor' \| 'nurse' \| 'admin' |
| status | TEXT | 'pending' \| 'approved' \| 'rejected' |
| approved_at | TIMESTAMPTZ | When admin approved |
| approved_by_admin_id | UUID FK | Which admin approved |
| created_at | TIMESTAMPTZ | |

#### `modules`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| title | TEXT | Module name (e.g., "Hand Hygiene") |
| description | TEXT | |
| hospital_id | BIGINT FK | Which hospital(s) this is for |
| pass_threshold | INT | Default 80 |
| max_attempts | INT | Default 3 |
| certificate_validity_days | INT | Default 365 |
| is_published | BOOLEAN | False = draft only |
| created_at | TIMESTAMPTZ | |

#### `content`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| module_id | BIGINT FK | References modules |
| type | TEXT | 'html' \| 'markdown' \| 'video' \| 'pdf' \| 'image' |
| title | TEXT | Display name |
| body | TEXT | HTML/MD/URL/filepath |
| duration_minutes | INT | For video/audio (optional) |
| display_order | INT | Sort order within module |
| created_at | TIMESTAMPTZ | |

#### `tests`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| module_id | BIGINT FK | References modules |
| type | TEXT | 'pre' \| 'post' |
| created_at | TIMESTAMPTZ | |
| UNIQUE(module_id, type) | | One pre, one post per module |

#### `questions`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| test_id | BIGINT FK | References tests |
| text | TEXT | Question text |
| options | JSONB | [{ text, is_correct }] |
| display_order | INT | Sort order |
| created_at | TIMESTAMPTZ | |

#### `test_attempts`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| user_id | UUID FK | References users |
| test_id | BIGINT FK | References tests |
| attempt_number | INT | 1, 2, 3, ... |
| score_percent | DECIMAL | 0-100 |
| passed | BOOLEAN | TRUE if score_percent >= 80 |
| attempted_at | TIMESTAMPTZ | |

#### `answers`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| attempt_id | BIGINT FK | References test_attempts |
| question_id | BIGINT FK | References questions |
| user_choice | TEXT | What user selected |
| is_correct | BOOLEAN | Computed on submit |
| created_at | TIMESTAMPTZ | |

#### `user_progress`
| Field | Type | Notes |
|-------|------|-------|
| user_id | UUID FK | Primary key part 1 |
| module_id | BIGINT FK | Primary key part 2 |
| status | TEXT | 'not_started' \| 'in_progress' \| 'completed' |
| last_accessed | TIMESTAMPTZ | When user last viewed content |
| PRIMARY KEY | (user_id, module_id) | One row per user-module pair |

#### `certificates`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| user_id | UUID FK | References users |
| module_id | BIGINT FK | References modules |
| issued_at | TIMESTAMPTZ | When generated |
| expires_at | TIMESTAMPTZ | issued_at + certificate_validity_days |
| certificate_url | TEXT | Path to PDF in Supabase Storage |
| revoked_at | TIMESTAMPTZ NULL | When admin revoked (null = active) |
| UNIQUE(user_id, module_id) | | One cert per user-module pair |

#### `admin_actions`
| Field | Type | Notes |
|-------|------|-------|
| id | BIGINT PK | |
| admin_id | UUID FK | Which admin did this |
| action | TEXT | 'approve', 'reject', 'create_module', 'delete_module', 'revoke_cert' |
| target_user_id | UUID FK NULL | If user-related |
| target_module_id | BIGINT FK NULL | If module-related |
| target_cert_id | BIGINT FK NULL | If cert-related |
| reason | TEXT | Why? |
| created_at | TIMESTAMPTZ | |

---

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "doctor@hospital.az",
  "password": "secure123",
  "name": "Dr. Ayaz",
  "role": "doctor",
  "hospital_id": 1
}
```
Response: `{ success: true, user_id: "uuid", message: "Pending admin approval" }`

**POST /api/auth/login**
```json
{
  "email": "doctor@hospital.az",
  "password": "secure123"
}
```
Response: `{ success: true, token: "jwt", user: { id, email, name, role, status, hospital_id } }`

**GET /api/auth/me** (requires token)
Response: `{ id, email, name, role, status, hospital_id, created_at }`

---

### Modules & Content

**GET /api/modules** (requires auth)
Response: `[{ id, title, description, pass_threshold, max_attempts, user_progress: { status, last_accessed } }]`

**GET /api/modules/:id**
Response: `{ id, title, description, content: [...], tests: [...] }`

**POST /api/modules** (admin only)
```json
{
  "title": "Hand Hygiene Best Practices",
  "description": "Learn proper handwashing techniques",
  "pass_threshold": 80,
  "max_attempts": 3,
  "certificate_validity_days": 365
}
```

---

### Tests & Scoring

**GET /api/tests/:test_id** (requires auth)
Response: `{ id, module_id, type, questions: [{ id, text, options: [{ text, order }] }] }`

**POST /api/tests/:test_id/attempt** (requires auth)
```json
{
  "answers": [
    { "question_id": 1, "user_choice": "Option A" },
    { "question_id": 2, "user_choice": "Option C" }
  ]
}
```
Response:
```json
{
  "attempt_id": 123,
  "score_percent": 85,
  "passed": true,
  "feedback": [
    { "question_id": 1, "is_correct": true, "explanation": "Correct!" },
    { "question_id": 2, "is_correct": false, "explanation": "The correct answer is B" }
  ]
}
```

---

### Certificates

**GET /api/certificates/:user_id** (requires auth)
Response: `[{ id, module_id, module_title, issued_at, expires_at, certificate_url, is_valid }]`

**GET /api/certificates/:user_id/:module_id/download**
Response: Download PDF file

**PUT /api/certificates/:cert_id/revoke** (admin only)
```json
{ "reason": "User requested revocation" }
```

---

### Admin

**GET /api/admin/users** (admin only)
Query: `?status=pending&hospital_id=1`
Response: `[{ id, email, name, role, hospital_id, status, created_at }]`

**POST /api/admin/users/:user_id/approve** (admin only)
```json
{ "reason": "Credentials verified" }
```

**GET /api/admin/audit-log** (admin only)
Query: `?action=approve&limit=50&offset=0`
Response: `[{ id, admin_id, admin_email, action, target_user_id, reason, created_at }]`

**GET /api/admin/dashboard** (admin only)
Response:
```json
{
  "total_users": 150,
  "approved_users": 120,
  "pending_approvals": 5,
  "modules_completed": 85,
  "pass_rate_percent": 92,
  "certificates_issued": 340,
  "recent_actions": [...]
}
```

**GET /api/admin/hospital/:hospital_id/stats** (admin only)
Response:
```json
{
  "hospital_name": "Central Hospital",
  "total_staff": 150,
  "approved_staff": 120,
  "completion_percent_by_module": [
    { "module_title": "Hand Hygiene", "percent_completed": 95 },
    { "module_title": "PPE Usage", "percent_completed": 78 }
  ]
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Core infrastructure + auth

**Backend Tasks:**
- [ ] Supabase project setup + schema migration
- [ ] `/api/auth/signup` — create user (status = pending)
- [ ] `/api/auth/login` — JWT token return
- [ ] `/api/auth/me` — get current user
- [ ] Middleware: `verifyAuth()` (check JWT)
- [ ] Middleware: `verifyAdmin()` (check admin email)
- [ ] `/api/modules` (GET — list only, no create yet)
- [ ] `/api/admin/users` (GET — list pending approvals)
- [ ] `/api/admin/users/:id/approve` (POST)
- [ ] Admin action logging in `admin_actions` table

**Frontend Tasks:**
- [ ] Auth pages: signup, login, forgot password
- [ ] User dashboard (empty, just shows modules list)
- [ ] Admin panel scaffolding (empty tabs)

**Testing:**
- [ ] User signup → user created with status=pending ✓
- [ ] Admin approve → status=approved, action logged ✓
- [ ] Login → only approved users allowed ✓

---

### Phase 2: Core Features (Weeks 3-7)
**Goal:** Users can take tests & get certificates

**Backend Tasks:**
- [ ] `/api/modules` (POST, PUT, DELETE — full admin CRUD)
- [ ] `/api/content` (POST, PUT, DELETE — upload content)
- [ ] `/api/tests` (POST, GET — create tests)
- [ ] `/api/questions` (POST, PUT, DELETE — MCQ management)
- [ ] `/api/tests/:id/attempt` (POST — submit answers & score)
- [ ] Scoring engine: calculate % correct, check pass threshold
- [ ] `/api/user_progress` (GET, auto-update on attempt)
- [ ] `/api/certificates` (POST, internal — auto-issue on post-test pass)
- [ ] PDF generation (use `pdfkit` or similar)
- [ ] `/api/admin/audit-log` (GET — view all actions)

**Frontend Tasks:**
- [ ] Module list + content viewer
- [ ] Pre/post test UI (render questions, collect answers)
- [ ] Score display + feedback
- [ ] Certificate download
- [ ] Admin: create module form
- [ ] Admin: upload content form
- [ ] Admin: create questions + options
- [ ] User progress dashboard

**Testing:**
- [ ] Take pre-test → score calculated ✓
- [ ] Pre-test pass → content unlocked ✓
- [ ] Take post-test → score >= 80 ✓
- [ ] Post-test pass → certificate auto-issued ✓
- [ ] Certificate → PDF downloadable ✓
- [ ] All admin actions → logged in audit_actions ✓

---

### Phase 3: Certificates (Weeks 8-9)
**Goal:** Complete certificate workflow

**Backend Tasks:**
- [ ] `/api/certificates/:cert_id/revoke` (PUT — admin revoke)
- [ ] Expiry validation (check expires_at vs now)
- [ ] Certificate validation endpoint
- [ ] Email notification on cert issue (optional, for MVP)

**Frontend Tasks:**
- [ ] Certificate viewer (show all certs, validity status)
- [ ] Certificate download link
- [ ] Admin: revoke certificate UI

**Testing:**
- [ ] Revoked cert → is_valid=false ✓
- [ ] Expired cert → is_valid=false ✓
- [ ] Certificate PDF contains user name, module, date ✓

---

### Phase 4: Polish & Compliance (Weeks 10-12)
**Goal:** Production-ready, monitored, documented

**Backend Tasks:**
- [ ] Rate limiting (100 req/min per user)
- [ ] Input validation on all endpoints
- [ ] SQL injection audit
- [ ] Error messages (no sensitive data leaked)
- [ ] Database query optimization (add indexes)
- [ ] API documentation (OpenAPI/Swagger)

**Frontend Tasks:**
- [ ] UX polish (loading states, error messages)
- [ ] Mobile responsiveness (responsive design)
- [ ] Accessibility audit (WCAG 2.1)

**DevOps Tasks:**
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment setup
- [ ] Production deployment checklist
- [ ] Monitoring + alerting (Vercel, Sentry)
- [ ] Backup strategy (Supabase auto-backups)

**Documentation:**
- [ ] API docs (Swagger/OpenAPI)
- [ ] Admin user guide (PDF)
- [ ] User guide (PDF)
- [ ] Setup runbook (deployment steps)

**Testing:**
- [ ] Load test (100+ concurrent users)
- [ ] 8-hour uptime test (no crashes)
- [ ] Security audit (JWT, CORS, headers)
- [ ] Database recovery test

---

## Security & Compliance

### Authentication
- Supabase Auth handles password hashing (bcrypt)
- JWT tokens (expires in 1 hour, refresh token expires in 7 days)
- Session storage in `sessionStorage` (can use `localStorage` with "remember me")

### Authorization
- **Frontend gate:** `VITE_ADMIN_EMAIL` env var (UX only, not security)
- **Server-side gate:** Every admin endpoint calls `verifyAdmin()` which checks token + email
- **Data isolation:** Users only see their hospital's modules + their own progress
- All user actions logged with timestamp + admin_id (for non-repudiation)

### Database
- All queries use parameterized statements (no SQL injection)
- RLS (Row-Level Security) policies on `users`, `certificates`, `admin_actions` (Supabase)
- Sensitive data: passwords hashed by Supabase Auth, never stored in our DB
- Audit trail: every admin action logged with reason + timestamp

### Data Privacy
- GDPR compliant: users can request data export (via `/api/users/:id/export`)
- Soft deletes only (set `is_archived=true`, data never deleted)
- Hospital data segregation (users in Hospital A can't see Hospital B's data)

### Monitoring
- Error tracking (Sentry or similar)
- Uptime monitoring (Vercel status page)
- Database backups (Supabase auto-backup every 24h)
- Audit log retention (7 years minimum for compliance)

---

## Decisions Made

### 1. Email Notifications
**Decision:** MVP **does NOT include email notifications**
- Users will see results on the platform immediately after test
- Email notifications deferred to Phase 4+ (requires SendGrid or SMTP setup)
- Why: Simpler MVP, fewer dependencies, can add later without schema changes

### 2. Rate Limiting
**Decision:** **Basic rate limiting** in Phase 4
- 100 requests per minute per user (per IP for unauthenticated)
- Implemented via Vercel middleware or Express rate-limit
- Why: Prevent abuse, protect database from hammering

### 3. Certificate Format
**Decision:** **PDF only**
- Generated on backend using `pdfkit` (Node.js library)
- Stored in Supabase Storage (`/certificates/user_id/module_id.pdf`)
- URL stored in `certificates.certificate_url` for download
- Include: user name, module title, issue date, expiry date, certificate ID
- Why: Professional, printable, easy to verify

### 4. Hospital Self-Signup
**Decision:** **Yes, hospitals self-register**
- Added `POST /api/hospitals` endpoint (admin or first user from hospital signs up hospital)
- Hospital code generated on creation (e.g., "HOSP_001")
- Users pick hospital on signup from dropdown
- Why: More flexible, scales to multiple hospitals without manual setup

### 5. Questions Storage (JSON vs Normalized)
**Decision:** **JSON for MVP, plan to normalize later**
- Current: `questions.options` stored as JSONB `[{ text, is_correct }]`
- Future (Phase 5+): Separate `question_options` table if analytics needed
- Why: Simpler for MVP, fast enough for ~200 questions, no JOIN complexity

### 6. Progress Calculation
**Decision:** **Derived from test_attempts, not stored**
- `user_progress.status` derived from test results:
  - `not_started` = no attempts yet
  - `in_progress` = pre-test passed, post-test not attempted/not passed
  - `completed` = post-test passed
- Not stored as `progress_percent` (avoid data inconsistency)
- Why: Single source of truth, always accurate

---

## Testing & QA

### Unit Tests
```bash
npm run test
```

Test coverage:
- [ ] Auth: signup, login, token refresh, verification
- [ ] Scoring: % calculation, pass threshold check
- [ ] Certificates: generation, expiry, revocation
- [ ] Admin actions: all CRUD operations logged
- [ ] Progress: status derivation correct

### Integration Tests
- [ ] Full user journey: signup → approve → login → take test → cert issue
- [ ] Admin journey: create module → add content → create test → publish
- [ ] Error cases: max attempts exceeded, invalid token, certificate already exists

### Manual QA
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Mobile (iPhone, Android) — responsive
- [ ] Accessibility: keyboard nav, screen reader (WCAG 2.1 AA)
- [ ] Performance: load time < 3s, test submission < 1s

### Load Testing
```bash
# Using k6 or Artillery
k6 run load-test.js
```
- 100+ concurrent users
- 50 requests per second
- Max response time: 2 seconds

---

## Deployment

### Pre-Deployment Checklist
- [ ] All Phase N tasks complete
- [ ] Tests passing (unit + integration)
- [ ] Code review approved
- [ ] Database migrations tested in staging
- [ ] Environment variables set in Vercel
- [ ] SSL certificate valid
- [ ] Backups enabled (Supabase)

### Production Deploy
```bash
# Via Vercel dashboard or CLI
vercel deploy --prod

# Or GitHub → Vercel auto-deploy on push to main
git push origin main
```

### Post-Deployment
- [ ] Smoke tests (login, take test, download cert)
- [ ] Monitor error rate (Sentry)
- [ ] Check uptime (Vercel status)
- [ ] Verify audit log entries
- [ ] Monitor database performance

### Rollback Plan
- [ ] Revert GitHub commit
- [ ] Previous Vercel deployment auto-available
- [ ] Database: restore from backup (last 24h)
- [ ] Communication: notify users via dashboard + email

---

## Contact & Questions

**Project Lead:** (Your name)
**Backend Developer:** (TBD)
**Frontend Developer:** (TBD)
**DevOps:** (TBD)

**Questions?** Create a GitHub issue or discussion in the repo.

---

**Last Updated:** March 2026
**Version:** 1.0 (MVP Planning Phase)
