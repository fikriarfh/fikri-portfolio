# Fikri Arif Fadillah — Portfolio & Live Demo Apps

![CI](https://github.com/fikriarfh/fikri-portfolio/actions/workflows/ci.yml/badge.svg)

A personal portfolio website with **four fully functional demo applications** served from a single zero-dependency Node.js server. Every project card on the site links to a live, working demo backed by a real relational database.

**Live site:** https://fikri-portfolio-7i5s.zai-ai.site

## Demo Apps

| App | Route | Highlights |
|---|---|---|
| Student Information System | [/apps/sis](https://fikri-portfolio-7i5s.zai-ai.site/apps/sis/) | **Session-protected** — student CRUD, search, statistics dashboard |
| Inventory Management | [/apps/inventory](https://fikri-portfolio-7i5s.zai-ai.site/apps/inventory/) | Stock in/out with transaction log, inventory valuation, low-stock alerts |
| Library Management System | [/apps/library](https://fikri-portfolio-7i5s.zai-ai.site/apps/library/) | Borrow/return workflow, member registry, overdue detection |
| Task Manager | [/apps/tasks](https://fikri-portfolio-7i5s.zai-ai.site/apps/tasks/) | Front-end only, localStorage persistence, inline editing |

> **Demo credentials for the SIS app:** `admin` / `demo1234` (sign-in form is pre-hinted).

The landing page itself is bilingual (EN/ID toggle) with browser-language detection and a `localStorage`-persisted choice.

## Tech Stack

- **Backend:** Node.js — `node:http` + `node:sqlite`, **zero external dependencies**
- **Frontend:** Vanilla HTML/CSS/JavaScript — no framework, no build step
- **Database:** SQLite (auto-created and seeded with sample data on first start)
- **CI:** GitHub Actions — 20 API smoke tests run on every push

## Project Structure

```
portfolio/
├── server.js          # HTTP server: static files + REST API routing
├── db.js              # SQLite schema (5 tables) + auto-seed
├── smoke-test.js      # 20 automated API tests (CRUD, validation, security)
└── public/
    ├── index.html     # Portfolio landing page (EN/ID)
    ├── i18n.js        # Bilingual dictionary + language switcher
    ├── style.css      # Dark modern theme
    ├── script.js      # Landing page interactions
    ├── assets/        # Profile photo + project SVG illustrations
    └── apps/          # The four demo apps (HTML + JS each)
```

## API Design

Resource-oriented REST endpoints with semantic status codes:

```
POST   /api/auth/login               # scrypt verification → HttpOnly session cookie
GET    /api/auth/me                  # resolves the session (401 when signed out)
POST   /api/auth/logout              # destroys the server-side session

GET    /api/sis/students?q=          # session required — search by name / NIM / major
POST   /api/sis/students             # 409 on duplicate NIM
PUT    /api/sis/students/:id
DELETE /api/sis/students/:id

POST   /api/inventory/products/:id/stock   # rejects overselling
POST   /api/library/loans                  # 409 if book already borrowed
POST   /api/library/loans/:id/return       # 400 on double return
```

All queries are parameterized (no SQL injection), request bodies are size-limited,
static file serving guards against path traversal, and business rules are enforced
at the database level (UNIQUE / CHECK / FK constraints).

**Session auth (SIS):** passwords are hashed with scrypt + per-user salt and compared
with `timingSafeEqual`; sessions are random 256-bit tokens stored server-side (only a
SHA-256 hash is persisted), delivered as an `HttpOnly` `SameSite=Lax` cookie with a
24-hour expiry, and lazily purged when expired. Logout destroys the server-side session.

## Running Locally

```bash
# Node.js >= 23.4 (node:sqlite is stable there)
node server.js

# Node.js 22.x needs the experimental flag
node --experimental-sqlite server.js
```

Then open http://localhost:3000 — the SQLite database is created and seeded automatically.

## Tests

```bash
node smoke-test.js                      # against localhost:3000
node smoke-test.js https://<your-url>   # against any deployment
```

20 checks covering health, full CRUD cycles, duplicate/invalid input rejection,
business-rule enforcement (no overselling, no double borrow/return), static page
availability, 404 handling, and path traversal protection.

## Notes

- Demo databases reset periodically on the cloud runtime — expected for a public demo.
- Known production gaps (documented intentionally): SIS has session auth but no role
  management; Inventory/Library remain open; no pagination; synchronous DB access.
  These are conscious demo trade-offs, not oversights.
