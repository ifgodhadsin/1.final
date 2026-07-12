# TransitOps Dashboard

> **Next.js 14 + React + Tailwind + Recharts + Prisma + PostgreSQL**

Full-stack fleet operations dashboard with real database persistence. All business rules from the POD are enforced at the API layer with Prisma transactions.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React 18      │────→│  Next.js 14 API  │────→│  Prisma Client  │
│   (Frontend)    │     │  (Route Handlers)│     │  (ORM + Types)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                         │
                              ↓                         ↓
                        ┌──────────┐              ┌──────────┐
                        │ lib/data │              │ PostgreSQL│
                        │ Business │              │  (DB)     │
                        │  Logic   │              └──────────┘
                        └──────────┘
```

## Database Schema (Prisma)

| Model | Fields | Relations |
|-------|--------|-----------|
| `Organization` | id, name, plan, timestamps | has many: users, vehicles, drivers, trips, fuel_logs, alerts, maintenance_logs, expenses |
| `User` | id, org_id, email, full_name, role, is_active | belongs to: org; has one: driver |
| `Vehicle` | id, reg#, name, type, capacity, odometer, cost, status, year, make, model, VIN, fuel_type | belongs to: org; has many: trips, fuel_logs, maintenance_logs, expenses, alerts |
| `Driver` | id, user_id, license#, category, expiry, safety_score, status, experience | belongs to: org, user; has many: trips, alerts |
| `Trip` | id, org_id, vehicle_id, driver_id, trip_number, source, destination, cargo, distances, status, timestamps, revenue | belongs to: org, vehicle, driver; has many: expenses |
| `FuelLog` | id, vehicle_id, liters, cost_per_liter, total_cost, odometer, station, location, fraud flags | belongs to: vehicle, org |
| `MaintenanceLog` | id, vehicle_id, service_type, description, cost, dates, status | belongs to: vehicle, org |
| `Expense` | id, vehicle_id, trip_id, type, amount, description, date | belongs to: vehicle, trip, org |
| `Alert` | id, org_id, vehicle_id, driver_id, type, severity, title, description, is_resolved | belongs to: org, vehicle, driver |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)

### 2. Setup Database

```bash
# Option A: Docker (recommended for hackathon)
docker run -d \
  --name transitops-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=transitops \
  -p 5432:5432 \
  postgres:15

# Option B: Local PostgreSQL
# Create database: transitops
```

### 3. Install & Configure

```bash
# Clone / extract project
cd transitops_nextjs

# Install dependencies
npm install

# Set environment variables (already in .env.local)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transitops?schema=public"

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with demo data
npm run db:seed

# Start dev server
npm run dev

# Open http://localhost:3000
```

### 4. Prisma Studio (Database GUI)

```bash
npx prisma studio
# Opens http://localhost:5555
```

## API Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/fleet` | List all vehicles | — |
| GET | `/api/drivers` | List all drivers | — |
| GET | `/api/trips` | List all trips | — |
| POST | `/api/trips` | Create trip (validates all 10 rules) | `{vehicle_id, driver_id, cargo_weight, destination, source?, planned_distance?, estimated_duration?}` |
| PATCH | `/api/trips/[id]/status` | Update trip status with side effects | `{status}` |
| POST | `/api/fuel` | Analyze fuel transaction for fraud | `{vehicle_id, liters, cost_per_liter, total_cost, odometer_reading, fuel_station?}` |
| GET | `/api/kpi` | Get fleet KPIs | — |

## Business Rules Enforced (All 10 POD Rules)

| # | Rule | Implementation |
|---|------|----------------|
| 1 | Registration unique | `@unique` in Prisma schema + DB constraint |
| 2 | Retired/In Shop hidden | Filtered in `getVehicles` + validation in `createTrip` |
| 3 | Expired license = blocked | Date comparison in `createTrip` |
| 4 | Suspended driver = blocked | Status check in `createTrip` |
| 5 | On Trip = no reassignment | Status check in `createTrip` |
| 6 | Cargo ≤ capacity | Decimal comparison in `createTrip` |
| 7 | Dispatch → auto On Trip | `prisma.vehicle.update` + `prisma.driver.update` in transaction |
| 8 | Complete → auto Available | Side effect in `updateTripStatus` |
| 9 | Cancel → auto Available | Side effect in `updateTripStatus` |
| 10 | Maintenance → In Shop | Triggered on `MaintenanceLog` creation |

## State Machine

```
                    ┌─────────────┐
                    │    DRAFT    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        ┌─────────┐  ┌──────────┐  ┌──────────┐
        │DISPATCHED│  │CANCELLED │  │ (other)  │
        └────┬────┘  └──────────┘  └──────────┘
               │
               ↓
        ┌────────────┐
        │IN PROGRESS │
        └─────┬──────┘
              │
      ┌───────┴───────┐
      ↓               ↓
┌──────────┐    ┌──────────┐
│COMPLETED │    │CANCELLED │
└──────────┘    └──────────┘
```

## Demo Flow for Judges

1. **Open dashboard** → see 5 vehicles, 2 drivers, live KPIs
2. **Click "Dispatch"** on VAN-001 → API validates rules → creates trip → updates vehicle/driver to `on_trip` → creates alert
3. **Check database** → Prisma Studio shows new trip, updated statuses, alert
4. **Click "Start"** → trip status → `in_progress`
5. **Click "Complete"** → status → `completed` → vehicle/driver restored → odometer updated → revenue logged
6. **Fuel fraud test** → enter 650L, $0.45/L → 70% confidence → HIGH risk → alert created in DB
7. **Refresh KPIs** → all metrics recalculated from PostgreSQL

## Production Deployment

### Vercel (Frontend + Serverless Functions)

```bash
# 1. Push code to GitHub
# 2. Connect Vercel project
# 3. Add DATABASE_URL environment variable
# 4. Deploy
```

### Railway / Render / AWS RDS (PostgreSQL)

```bash
# Create managed PostgreSQL
# Update DATABASE_URL in Vercel dashboard
# Redeploy
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed demo data
```

## License

MIT — Built for the TransitOps hackathon.


## 🚀 Automatic Deployment (GitHub Actions)

### One-Time Setup

```bash
# 1. Push code to GitHub
git add .
git commit -m "Add GitHub Actions workflows"
git push origin main

# 2. Install GitHub CLI (if not already)
# https://cli.github.com/

# 3. Login to GitHub
gh auth login

# 4. Run setup script
./setup.sh
# This will prompt for:
#   - VERCEL_TOKEN (from https://vercel.com/account/tokens)
#   - VERCEL_ORG_ID (from Vercel project settings)
#   - VERCEL_PROJECT_ID (from Vercel project settings)
#   - DATABASE_URL (your PostgreSQL connection string)
```

### Manual Secret Setup (if setup.sh fails)

```bash
# Set each secret individually
git remote get-url origin  # Get your repo URL

gh secret set VERCEL_TOKEN -b"your_vercel_token" --repo yourusername/transitops
git secret set VERCEL_ORG_ID -b"your_org_id" --repo yourusername/transitops
git secret set VERCEL_PROJECT_ID -b"your_project_id" --repo yourusername/transitops
git secret set DATABASE_URL -b"your_database_url" --repo yourusername/transitops
```

### How It Works

| Trigger | Workflow | What Happens |
|---------|----------|--------------|
| Push to `main` | `deploy.yml` | Tests → Builds → Deploys to production |
| Pull request | `deploy.yml` | Tests → Deploys preview URL |
| Schema change | `migrate.yml` | Pushes Prisma schema to DB |
| PR opened | `e2e.yml` | Runs Playwright E2E tests |

### Monitoring Deployments

- **GitHub Actions**: `https://github.com/YOUR_USERNAME/transitops/actions`
- **Vercel Dashboard**: `https://vercel.com/YOUR_USERNAME/transitops`
- **Production URL**: `https://transitops.vercel.app`
- **Preview URLs**: Auto-generated per PR

### Rollback

```bash
# Rollback to previous deployment
vercel rollback --token=YOUR_VERCEL_TOKEN

# Or via Vercel dashboard → Deployments → Promote
```
