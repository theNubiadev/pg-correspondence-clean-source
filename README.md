# PG School Correspondence Management System

Digital correspondence register for the Postgraduate College, University of Ibadan.

## Run on another PC (Windows)

1. Install **Node.js 20 LTS** — https://nodejs.org  
2. Start **MySQL** in XAMPP  
3. Unzip this project  
4. Double-click **`SETUP-AND-RUN.bat`**  
5. Open http://localhost:3000  

Later days: **`START.bat`** (MySQL must be running).

Full notes: `README-START-HERE.txt` and `HANDOFF.md`.

### Demo logins (after setup)

| Login | Password |
|--------|----------|
| `registry.admin@pgcollege.ui.edu.ng` | `ChangeMe!2026` |
| username `provost` | `Staff@2026` |
| `finance` / `records` / `ict` / … | `Dept@2026` |

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15, React 19, TypeScript |
| Database | MySQL via XAMPP + Prisma 6 |
| Files | Local folder `storage/correspondence` |
| Auth | Cookie sessions (JWT) |

## Manual setup

```bash
copy .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Create database `postgraduate_correspondence` in phpMyAdmin if needed.
