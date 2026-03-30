# IPC Training Platform

**Project:** IPC (Infeksiyaların Profilaktikası və İnfeksion Nəzarət) Training & Compliance Platform for Hospitals
**Status:** Phase 2 Active — Core Learning Features Live
**Tech Stack:** React 19 + Vite, Supabase (Auth + PostgreSQL + Edge Functions), Tailwind CSS v4, Vercel
**Location:** Azerbaijan

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [What's Built](#whats-built)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Module & Certification Logic](#module--certification-logic)
6. [Auth & User Flow](#auth--user-flow)
7. [Edge Functions](#edge-functions)
8. [Deployment](#deployment)
9. [Roadmap](#roadmap)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (auth + database + edge functions)
- Vercel account

### Setup
```bash
git clone https://github.com/sugraazimova-cmyk/ipc-training.git
cd ipc-training
npm install

# Create .env.local with:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJxx...
# VITE_ADMIN_EMAIL=admin@example.com

npm run dev        # Start dev server
npm run build      # Production build
```

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Supabase public anon key |
| `VITE_ADMIN_EMAIL` | `.env.local` + Vercel | Email address that gets admin role |

### Supabase Edge Function secrets (auto-injected by Supabase)
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side DB access |

### Deploy Edge Function
```bash
npx supabase functions deploy submit-test --no-verify-jwt
```

---

## What's Built

### ✅ Authentication
- Signup with full profile fields
- Login with email + password
- Forgot password / reset via Supabase email
- Strong password enforcement + strength meter

### ✅ User Registration
Fields collected on signup:
- Ad, Soyad, Ata adı
- E-poçt + password
- Xəstəxana adı — dropdown + manual entry fallback
- İxtisas (specialty), Öhdəlik (həkim / tibb bacısı), Vəzifə (position)

### ✅ Admin Approval Workflow
- New users land on Pending Approval page after signup
- Admin reviews in Admin Panel → Approve / Reject / Pending
- Email notification on approval (Supabase trigger + Resend API)

### ✅ Admin Panel (`/admin`)
- Stats: pending / approved / rejected counts
- Filterable user table with full profile details
- Per-user status controls

### ✅ Student Dashboard (`/dashboard`)
- Module list with progress indicators
- Stats: active, completed, certificates
- Profile card, circular progress ring

### ✅ Module Learning Flow (`/module/:moduleId`)
Three-step progression: **Pre-test → Materiallar → Post-test**

Step indicator with locked / active / done states. Each step gated server-side.

#### Pre-test
- One attempt per certification cycle (1 year)
- Passing NOT required — completing it unlocks content
- Cannot retake until certificate expires

#### Content (Materiallar)
- Sequential content items: video, PDF, HTML
- Always accessible after pre-test (before/after tests, after cert)
- YouTube: skip-forward prevention via IFrame API + `maxReachedRef` polling
- Storage video: skip-forward prevention via `onSeeking` + `maxWatchedRef`
- Progress tracked per item in `content_progress`
- `last_content_access_at` updated after 10+ seconds of real engagement

#### Post-test
- Requires: pre-test attempted + 100% content completed
- After failure: must review content before retry
- After pass: 3-day cooldown before next attempt
- Correct answers shown only on pass

### ✅ Certificates
- Auto-issued on post-test pass
- 1-year validity
- After expiry → new cycle → pre-test required again

### ✅ Edge Function: `submit-test`
Server-side test scoring, gate enforcement, and certificate issuance. See [Edge Functions](#edge-functions).

---

## Architecture

```
Browser → React SPA (Vite)
              │
              ├─ Supabase Auth      (login, signup, password reset)
              ├─ Supabase DB        (direct client queries via RLS)
              └─ Supabase Functions (submit-test — scoring + gates + certs)

GitHub → Vercel (auto-deploy on push to main)
```

All read queries go directly from the React client to Supabase via RLS. All write operations requiring server-side validation go through the Edge Function.

### Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Routes + auth state + session management |
| `src/lib/supabase.js` | Supabase client singleton |
| `src/components/ModulePage.jsx` | Module flow orchestration (pre-test → content → post-test) |
| `src/components/ContentView.jsx` | Content list + YouTube/storage video players + progress tracking |
| `src/components/TestView.jsx` | Quiz UI + result view + submit via Edge Function |
| `src/components/Dashboard.jsx` | Student dashboard |
| `src/components/AdminPanel.jsx` | Admin user management |
| `supabase/functions/submit-test/index.ts` | Test scoring + gate enforcement + certificate issuance |
| `supabase/migrations/001_initial_schema.sql` | Base schema |
| `supabase/migrations/002_schema_updates.sql` | content_progress, user_notes, last_content_access_at |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User profiles (extends Supabase auth) |
| `hospitals` | Hospital list |
| `modules` | Training modules (pass_threshold, certificate_validity_days) |
| `content` | Content items per module (type: video/pdf/html, display_order) |
| `tests` | One pre + one post test per module |
| `questions` | MCQ questions — options stored as JSONB `[{text, is_correct}]` |
| `test_attempts` | Every submission: score_percent, passed, attempted_at |
| `answers` | Per-question answer per attempt |
| `user_progress` | Per user-module: status, last_accessed, last_content_access_at |
| `content_progress` | Per user-content: completed, watch_pct, completed_at |
| `certificates` | Issued certs: issued_at, expires_at, revoked_at |
| `user_notes` | Per user-content note text (schema ready, UI pending) |
| `admin_actions` | Audit log for admin operations |

### `user_progress` key columns
| Column | Notes |
|--------|-------|
| `status` | `not_started` → `in_progress` → `completed` |
| `last_accessed` | Updated on any module visit |
| `last_content_access_at` | Updated after 10s+ engagement — used for post-test gate C1 |

---

## Module & Certification Logic

### Pre-test gate
1. Block if valid certificate exists (cycle still active)
2. Block if any pre-test attempt exists in current cycle
3. On any submission: unlock content (pass not required)

### Post-test gates (all must pass)
1. Pre-test attempted in current cycle
2. All content items 100% completed
3a. Last attempt **failed** → `last_content_access_at > last_post_attempt_at`
3b. Last attempt **passed** → 3-day cooldown elapsed

### `last_content_access_at` update rules
- Videos: after 10+ seconds of actual playback
- PDF / HTML: when "Oxudum ✓" is clicked
- NOT on page load

### Certificate lifecycle
```
Pre-test → Content (100%) → Post-test pass → Certificate (1 year)
                                                     │
                                            Certificate expires
                                                     │
                                             New cycle begins
                                                     │
                                          Pre-test required again
```

---

## Auth & User Flow

```
1. Signup → users row inserted (status='pending')
2. PendingApproval page shown
3. Admin approves → status='approved' → email sent via Resend
4. User logs in → Dashboard
5. Opens module → Pre-test → Content → Post-test → Certificate
```

### Admin access
Identified by `VITE_ADMIN_EMAIL`. Can access `/admin` and sees Admin Panel link in sidebar.

### Email notifications
Supabase DB trigger + `pg_net` → Resend API. Currently limited to verified sender addresses until a custom domain is set up on Resend.

---

## Edge Functions

### `submit-test`
**Deploy:** `npx supabase functions deploy submit-test --no-verify-jwt`
**Auth:** Bearer token validated via `db.auth.getUser(token)` inside the function

**Input:**
```json
{
  "test_id": 1,
  "answers": [{ "question_id": 1, "user_choice": "Option text" }]
}
```

**Output:**
```json
{
  "attempt_id": 42,
  "score_percent": 80.00,
  "passed": true,
  "correct_count": 8,
  "total_questions": 10,
  "attempt_number": 1,
  "feedback": [{ "question_id": 1, "is_correct": true, "correct_answer": "..." }],
  "certificate_issued": true,
  "certificate_expires_at": "2027-03-30T..."
}
```

`correct_answer` only present in feedback when `passed = true`.

---

## Deployment

**Live URL:** `https://ipctrainingportal.vercel.app`
**Repo:** https://github.com/sugraazimova-cmyk/ipc-training
Auto-deploys from `main` on push.

### Vercel env vars required
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

### Database setup
Run in Supabase SQL Editor in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_schema_updates.sql`

---

## Roadmap

### Next Up (Known Issues + UX)
- [ ] Pre-test result summary page (show score + feedback before going to materials)
- [ ] Materials → Post-test: intentional CTA button instead of auto-redirect
- [ ] Test review: always show correct answer (even on correct responses)
- [ ] Storage video seek-forward restriction (HTML5 — YouTube already works)

### UI Redesign (Planned)
- [ ] Sidebar-based ModulePage layout (Coursera-style two-column)
- [ ] Dedicated ContentItemPage (`/module/:id/content/:contentId`)
- [ ] Notes UI (user_notes table ready, UI pending)
- [ ] Prev/next content item navigation

### Phase 3 — Admin Content Management
- [ ] Create/edit/publish modules from admin UI
- [ ] Upload video/PDF content
- [ ] Build MCQ question sets in admin UI
- [ ] Hospital-level analytics

### Phase 4 — Polish
- [ ] PDF certificate generation and download
- [ ] Mobile responsiveness
- [ ] Custom domain + Resend domain verification (enables email to all users)
- [ ] Audit log viewer in admin panel

---

**Last Updated:** March 2026
