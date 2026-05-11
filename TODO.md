# EcoLife — Project To-Do List
**Stack:** NestJS (backend) · Next.js (frontend)
**Target:** Q3 2026 MVP · Web + PWA (mobile-first)

---

## M0 — Foundation

### Backend (NestJS)
- [ ] Initialize NestJS project with TypeScript strict mode
- [ ] Set up PostgreSQL database + TypeORM/Prisma schema
- [ ] Configure environment variables and config module
- [ ] Set up Auth module — OAuth (Google, Apple) + password-based (Argon2id)
- [ ] JWT access/refresh token strategy with guards
- [ ] Set up User module — User entity, CRUD endpoints
- [ ] Set up global error handling and validation pipes (class-validator)
- [ ] Set up structured JSON logging
- [ ] Configure CORS, rate limiting, Helmet (security headers)
- [ ] Set up database migrations workflow
- [ ] Set up file upload infrastructure (S3/object storage for photos)
- [ ] Set up web push notification infrastructure (web-push library)

### Frontend (Next.js)
- [ ] Initialize Next.js project (App Router, TypeScript)
- [ ] Set up Tailwind CSS + design system tokens (colors, spacing, typography)
- [ ] Create mobile-first responsive layout shell (bottom nav, header)
- [ ] Set up auth pages — login, register, OAuth flows
- [ ] Set up auth context/state management (NextAuth.js or custom)
- [ ] Create placeholder screens for all main sections (Home, Tasks, Score, Friends, Shop, Profile)
- [ ] Set up PWA manifest + service worker basics
- [ ] Set up API client (axios/fetch wrapper with auth interceptors)
- [ ] Set up i18n architecture (English only, but i18n-ready structure)

### Infra / DevOps
- [ ] Set up monorepo structure (or two repos with shared types package)
- [ ] Set up Docker Compose for local dev (API + DB + Redis)
- [ ] Set up CI pipeline (lint, type-check, tests)
- [ ] Set up staging deployment

---

## M1 — Core Loop (MVP)

### Backend

#### Onboarding Questionnaire
- [ ] Questionnaire module — questions entity, responses entity
- [ ] `GET /questionnaire` — return questions (transport, diet, energy, waste, consumption, goals)
- [ ] `POST /questionnaire` — submit answers, calculate baseline eco score, return personalized starter tasks
- [ ] Handle skipped questions (default to neutral baseline)
- [ ] `PUT /questionnaire` — retake from settings (P1)

#### Task System
- [ ] Task entity — name, category, description, base points, verification mechanism(s), env impact metrics
- [ ] Task submission entity — user, task, proof, status (pending/approved/rejected/appealed), timestamps
- [ ] `GET /tasks/today` — return personalized daily suggested tasks
- [ ] `POST /tasks/:id/submit` — submit proof (photo upload, sensor data, geo check-in)
- [ ] `POST /tasks/:id/appeal` — request human review on rejection
- [ ] Verification service — auto-approve / auto-reject / queue logic by mechanism type
- [ ] Photo verification: validate in-app capture (EXIF metadata, timestamp, GPS)
- [ ] Seed task catalog (15+ tasks across all 5 categories)

#### Eco Score
- [ ] Eco score service — calculate 0–1000 score from rolling 30-day window
- [ ] Category breakdown calculation (transport, diet, energy, waste, consumption)
- [ ] `GET /eco-score` — return current score, baseline, improvement delta, category breakdown
- [ ] `GET /eco-score/methodology` — return scoring methodology explanation
- [ ] Daily recalculation cron job

#### Streak System
- [ ] Streak entity — user, current streak, longest streak, last completed date, registered timezone
- [ ] Streak service — increment on verified task, reset on miss, use user's registered timezone (not device)
- [ ] Auto-apply streak freeze (1 per 30-day period) (P1)
- [ ] Milestone detection (7, 14, 30, 60, 100, 365 days) — trigger bonus points
- [ ] `GET /streaks` — return current streak, milestones, history
- [ ] Streak-at-risk push notification scheduler (user-configurable time)

#### Points Ledger
- [ ] Points ledger entity — immutable append-only (event type, amount, task ref, timestamp)
- [ ] Points service — award on verified task, apply streak multipliers (7d=1.1×, 30d=1.25×, 100d=1.5×)
- [ ] First-time category completion bonus logic
- [ ] Daily earning cap enforcement
- [ ] `GET /points` — return derived balance + recent ledger entries

### Frontend

#### Onboarding Flow
- [ ] Multi-step questionnaire UI (progress bar, skip buttons, ≤3 min completion)
- [ ] Baseline eco score reveal screen with category breakdown
- [ ] Starter tasks display (5–7 tasks) with "start first task" CTA

#### Home Screen
- [ ] Current streak display (prominent, with flame animation)
- [ ] Today's suggested tasks list
- [ ] Eco score summary card (current score + improvement)
- [ ] Points balance display

#### Task Detail & Submission
- [ ] Task detail page — description, impact metrics, verification method, points value
- [ ] In-app camera capture for photo proof (block/downweight gallery uploads)
- [ ] Sensor data collection UI (step counter, GPS tracking for walking tasks)
- [ ] Submission status tracking UI (pending → approved/rejected)
- [ ] Rejection reason display + appeal button

#### Eco Score Page
- [ ] Score gauge visualization (0–1000)
- [ ] Improvement vs. baseline indicator
- [ ] Category breakdown chart (P1)
- [ ] Link to scoring methodology

#### Streak Celebrations
- [ ] Milestone celebration animations (confetti/particles at 7, 14, 30, 60, 100, 365 days)
- [ ] Streak freeze notification/indicator UI

---

## M2 — Social

### Backend

#### Friends
- [ ] Friendship entity (bidirectional, status: pending/accepted/blocked)
- [ ] `POST /friends/request` — send by username or invite link
- [ ] `POST /friends/:id/accept` — accept request
- [ ] `DELETE /friends/:id` — remove friend
- [ ] `POST /friends/:id/block` — block user
- [ ] Invite link generation service

#### Leaderboard
- [ ] `GET /leaderboard/weekly` — friends ranked by weekly points earned (not absolute eco score)
- [ ] Weekly leaderboard reset cron job

#### Activity Feed
- [ ] Friend activity entity — opt-in sharing per task submission
- [ ] `GET /feed` — friends' completed tasks
- [ ] `POST /feed/:id/cheer` — react to friend's task (P1)

#### Rewards Shop
- [ ] Shop item entity — name, type (cosmetic/booster), price in points, image
- [ ] `GET /shop` — browse items with point prices
- [ ] `POST /shop/:id/purchase` — buy with points (debit ledger, check balance)
- [ ] Inventory entity — user's owned items
- [ ] `GET /inventory` — user's items
- [ ] `POST /inventory/:id/equip` — equip cosmetic

#### Push Notifications
- [ ] Web push subscription management endpoint
- [ ] Streak-at-risk notifications (user-configurable time)
- [ ] Friend request notifications
- [ ] Weekly leaderboard summary notification

### Frontend

#### Friends Page
- [ ] Add friend by username / share invite link UI
- [ ] Pending friend requests list (accept/decline)
- [ ] Friends list with remove/block options

#### Leaderboard Page
- [ ] Weekly friends leaderboard (ranks, avatars, points earned this week)
- [ ] Current user row highlighted

#### Activity Feed
- [ ] Friend activity feed with cheer/react buttons (P1)
- [ ] Per-task privacy toggle on submission

#### Rewards Shop
- [ ] Shop browse UI with category filters (cosmetics, boosters)
- [ ] Purchase confirmation modal (show current balance, cost, result)
- [ ] Insufficient balance messaging
- [ ] Inventory page with equip/unequip

#### Notifications
- [ ] Push notification permission request flow
- [ ] Notification preferences page (streak reminder time picker)
- [ ] In-app notification center

---

## M3 — Depth

### Backend

#### Challenges (P1)
- [ ] Challenge entity — challenger, opponent, metric, duration, status
- [ ] `POST /challenges` — create 1-on-1 challenge with configurable duration and metric
- [ ] `POST /challenges/:id/accept` — accept challenge
- [ ] `GET /challenges` — active and past challenges
- [ ] Challenge resolution cron job (determine winner at end)

#### Advanced Verification
- [ ] Integrate image classification API (or custom model) for photo verification
- [ ] Integrate OCR service for receipt-based task verification
- [ ] Anti-cheat signals — behavioral analysis, EXIF cross-checks, duplicate detection
- [ ] Human review queue + admin panel for manual verification appeals

#### Economy Tuning
- [ ] Admin dashboard for economy metrics (sink/source ratio, inflation tracking)
- [ ] Configurable point values, caps, and multipliers

### Frontend

#### Challenges UI
- [ ] Challenge a friend flow (pick friend, metric, duration)
- [ ] Active challenge progress tracker (side-by-side comparison)
- [ ] Challenge result screen (winner/loser animation)

#### Internal Admin Panel
- [ ] Verification review queue UI
- [ ] Economy monitoring dashboard

---

## M4 — Polish & Launch

### Frontend
- [ ] PWA full installability (manifest, all icon sizes, offline shell, splash screen)
- [ ] WCAG 2.1 AA accessibility audit + fixes
  - [ ] All non-decorative images have alt text
  - [ ] Full keyboard navigation
  - [ ] Color contrast compliance
  - [ ] Screen reader testing
- [ ] Performance optimization
  - [ ] Home screen loads ≤2 seconds on 4G (P75)
  - [ ] Image optimization (lazy loading, WebP)
  - [ ] Bundle analysis + code splitting

### Backend
- [ ] Task list response ≤500ms (P95) — query optimization + indexing
- [ ] Photo verification verdict ≤5 seconds (P90) — pipeline optimization
- [ ] Load test — validate 10k DAU capacity with horizontal scaling path
- [ ] `GET /user/export` — data export (GDPR/privacy)
- [ ] `DELETE /user` — account deletion

### Cross-cutting
- [ ] End-to-end tests (critical flows: onboard → task → verify → earn points → shop purchase)
- [ ] Security audit (OWASP Top 10)
- [ ] TLS everywhere + HSTS preloaded
- [ ] Privacy policy, terms of service, photo retention policy pages
- [ ] Closed beta + Day-7 retention measurement before public launch

---

## Post-Launch (M5+)
- [ ] Real-world rewards (tree planting, NGO donations via verified partners)
- [ ] Booster items in shop (extra streak freezes, double-points hour) (P1)
- [ ] 1-on-1 challenge head-to-head feature (if not shipped in M3)
- [ ] Group challenges (3+ participants) (P2)
- [ ] Eco score cohort comparison — anonymous benchmark vs. similar lifestyles (P2)
- [ ] Streak history calendar visualization (P2)
- [ ] Contact import to find friends (P2)
- [ ] Multi-language / i18n support
- [ ] Family/group accounts
- [ ] Partner integrations (utility providers, wearables)
