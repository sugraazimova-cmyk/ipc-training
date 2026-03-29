# IPC Training Platform

**Project:** IPC (Infeksiyaların Profilaktikası və İnfeksion Nəzarət) Training & Compliance Platform for Hospitals
**Status:** Phase 1 Complete — Live on Vercel
**Tech Stack:** React 19 + Vite, Supabase (Auth + PostgreSQL), Tailwind CSS v4, Vercel
**Location:** Azerbaijan

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [What's Built](#whats-built)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Auth & User Flow](#auth--user-flow)
6. [Email Notifications](#email-notifications)
7. [Deployment](#deployment)
8. [Roadmap](#roadmap)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (auth + database)
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
| `VITE_ADMIN_EMAIL` | `.env.local` + Vercel | Email address that gets admin access |

---

## What's Built

### ✅ Authentication
- Signup with full profile fields (see [Database Schema](#database-schema))
- Login with email + password
- Forgot password / reset password flow via Supabase email
- Strong password enforcement (8+ chars, uppercase, lowercase, number, special char)
- Password strength meter on signup form

### ✅ User Registration Form
Fields collected on signup:
- Ad (first name), Soyad (surname), Ata adı (father's name)
- E-poçt + password
- Xəstəxana adı — dropdown list + "my hospital isn't listed" manual entry
- İxtisas (specialty) — free text with datalist suggestions
- Öhdəlik — radio: İPİN həkimi / İPİN tibb bacısı
- Tutduğu vəzifə (position) — free text with datalist suggestions

### ✅ Admin Approval Workflow
- New users land on a **Pending Approval** page after signup
- Admin reviews registrations in the **Admin Panel**
- Admin can: **Approve**, **Reject**, or move back to **Pending**
- Users rejected see a distinct "Rədd edildi" screen
- Email notification sent to user on approval (see [Email Notifications](#email-notifications))

### ✅ Admin Panel (`/admin`)
- Stats cards: pending / approved / rejected counts
- Tabs to filter by status
- Full user details table: name, email, hospital, specialty, role, position, registration date
- Approve / Reject / Pending buttons per user
- Back to Dashboard button

### ✅ Student Dashboard (`/dashboard`)
- Fixed sidebar: navigation, Admin Panel link (admin only), logout
- Welcome banner with user's first name
- Stats: active modules, completed modules, total score
- Training modules list (from `modules` table)
- Right panel: profile card, circular progress ring, info card
- Background image from `/public/background.png`

### ✅ Navigation
- React Router v6 — all pages are real URLs (`/login`, `/signup`, `/dashboard`, `/admin`, `/pending`, `/update-password`)
- Browser back/forward buttons work correctly throughout
- Route guards redirect based on session + approval status

---

## Architecture

```
Browser → React SPA (Vite)
              │
              ├─ Supabase Auth   (login, signup, password reset)
              ├─ Supabase DB     (users, modules tables — direct from client via RLS)
              └─ Supabase pg_net (HTTP trigger → Resend API for email on approval)

GitHub → Vercel (auto-deploy on push to main)
```

**No separate backend API.** All data access goes directly from the React app to Supabase using the anon key, protected by Row Level Security policies.

### Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Route definitions + auth state + session management |
| `src/lib/supabase.js` | Supabase client (singleton) |
| `src/components/LoginForm.jsx` | Login + forgot password |
| `src/components/SignupForm.jsx` | Registration with all profile fields |
| `src/components/Dashboard.jsx` | Student dashboard with sidebar |
| `src/components/AdminPanel.jsx` | Admin user management |
| `src/components/PendingApproval.jsx` | Pending / rejected status page |
| `src/components/UpdatePassword.jsx` | Password reset after email link |
| `src/components/ui/gaming-login.jsx` | `PhotoBackground` + `GlassCard` shared UI |

---

## Database Schema

### `users` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Matches Supabase Auth `auth.users.id` |
| `email` | TEXT | |
| `full_name` | TEXT | ad + soyad + ata_adi combined |
| `ad` | TEXT | First name |
| `soyad` | TEXT | Surname |
| `ata_adi` | TEXT | Father's name |
| `hospital_name` | TEXT | From dropdown or manual entry |
| `ixtisas` | TEXT | Specialty |
| `ohdelik` | TEXT | `İPİN həkimi` or `İPİN tibb bacısı` |
| `vezife` | TEXT | Position/job title |
| `status` | TEXT | `pending` \| `approved` \| `rejected` |
| `created_at` | TIMESTAMPTZ | |

### `modules` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | |
| `title` | TEXT | Module name |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `user_progress` table

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID FK | References `users.id` |
| `module_id` | BIGINT FK | References `modules.id` |
| `status` | TEXT | `not_started` \| `in_progress` \| `completed` |
| `last_accessed` | TIMESTAMPTZ | |
| PRIMARY KEY | `(user_id, module_id)` | One row per user-module pair |

> `user_progress` is not yet created in Supabase — needed before implementing module completion tracking.

### RLS Policies (users table)

| Policy | Who | Action |
|--------|-----|--------|
| Users can insert own row | Authenticated | INSERT where `id = auth.uid()` |
| Users can read own row | Authenticated | SELECT where `id = auth.uid()` |
| Admin can read all rows | Admin email | SELECT all |
| Admin can update all rows | Admin email | UPDATE all |

---

## Auth & User Flow

```
1. User signs up → row inserted in users table with status='pending'
2. User sees PendingApproval page
3. Admin logs in → sees user in AdminPanel under "Gözləyənlər" tab
4. Admin clicks "Təsdiqlə" → status updated to 'approved'
   → Supabase trigger fires → email sent via Resend API
5. User can now log in → lands on Dashboard
6. If admin clicks "Rədd et" → user sees rejection screen
```

### Admin Access
Admin is identified by email matching `VITE_ADMIN_EMAIL` env var.
- Admin sees Dashboard + "Admin Panel" button in sidebar
- Admin can navigate to `/admin` for user management

---

## Email Notifications

Email is sent automatically when a user's status changes to `approved`.

**Implementation:** Supabase database trigger using `pg_net` extension calls the Resend API.

**Current limitation:** Without a verified custom domain on Resend, emails can only be sent to the admin's own email address. Full user notifications will work once a domain is purchased and verified at resend.com.

**To set up after domain purchase:**
1. Add domain in Resend dashboard → get DNS records
2. Add DNS records at domain registrar
3. Update the trigger's `"from"` field from `onboarding@resend.dev` to `noreply@yourdomain.com`
4. Update Resend API key if needed

---

## Deployment

**Live URL:** Deployed on Vercel (auto-deploys from `main` branch on GitHub)
**Repo:** https://github.com/sugraazimova-cmyk/ipc-training

### Deploy steps
1. Push to `main` → Vercel picks it up automatically
2. Or: `vercel deploy --prod` from CLI

### Required Vercel environment variables
Set these in Vercel → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

---

## Roadmap

### Next up
- [ ] Domain purchase + Resend domain verification (unblocks email to all users)
- [ ] Add training module content to `modules` table
- [ ] Sidebar pages: Modullar, Cədvəl, Sertifikatlar, Parametrlər

### Phase 2 — Core Learning Features
- [ ] Module content viewer (video, PDF, text)
- [ ] Pre-test + post-test (MCQ)
- [ ] Scoring engine (pass threshold 80%)
- [ ] Auto-issued PDF certificates
- [ ] User progress tracking

### Phase 3 — Admin Content Management
- [ ] Create/edit/publish modules from admin panel
- [ ] Upload content (video, PDF)
- [ ] Create MCQ questions
- [ ] Hospital-level analytics

### Phase 4 — Polish
- [ ] Mobile responsiveness
- [ ] Accessibility (WCAG 2.1)
- [ ] Rate limiting
- [ ] Audit log viewer in admin panel

---

**Last Updated:** March 2026

