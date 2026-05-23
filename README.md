# Allo Inventory

A multi-warehouse inventory reservation system built for the Allo Health take-home exercise.

**Live URL**: https://allo-inventory-two.vercel.app

**GitHub**: https://github.com/Mohit-Balachander/allo-inventory

---

## The Problem

When a customer proceeds to checkout, payment can take several minutes (3DS flows, UPI confirmations). During that window, thousands of other shoppers may be looking at the same product page.

- Decrement stock at payment time → two customers can pay for the same unit
- Decrement stock at add-to-cart → inventory looks depleted, conversion tanks

**Solution**: A reservation system. Stock is temporarily held for 10 minutes at checkout initiation. Confirmed on payment success, released on failure or timeout.

---

## Live Demo Flow

1. Visit https://allo-inventory-two.vercel.app
2. Browse products with real-time stock per warehouse
3. Click **Reserve** on any product → choose warehouse and quantity
4. Watch the **live countdown** on the checkout page (10 minutes)
5. Click **Confirm Purchase** to complete or **Cancel** to release stock
6. Stock updates immediately without page refresh
7. Try reserving the **Portable SSD 1TB** (1 unit per warehouse) from two browser tabs simultaneously to see the 409 race condition response

---

## Architecture

**Frontend** → Next.js 16 App Router (Vercel)

**API Layer** → Next.js Route Handlers (serverless functions)

**Database** → Neon Postgres via Prisma 7
- Tables: Product, Warehouse, Stock, Reservation

**Cache + Locking** → Upstash Redis
- Distributed lock per product+warehouse
- Idempotency key cache (24hr TTL)

**Cron** → Vercel Cron → `/api/cron/expire` (daily)
---

## Concurrency — The Core Problem

Two simultaneous requests for the last unit of a SKU must result in exactly one success and one 409. This is solved with two layers:

**Layer 1 — Redis Distributed Lock**
Request A ──▶ SET lock:productId:warehouseId NX EX 10 ──▶ acquired ──▶ proceeds
Request B ──▶ SET lock:productId:warehouseId NX EX 10 ──▶ denied   ──▶ 429

**Layer 2 — Postgres SELECT FOR UPDATE**
```sql
SELECT id, total, reserved
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE  -- row-level lock, blocks concurrent transactions
```

Even if two requests bypassed the Redis lock, only one would win the Postgres row lock. The other would see the updated `reserved` count and return 409.

This double-locking guarantees exactly-one semantics under concurrency.

---

## API

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units — returns 409 if insufficient stock, 429 if lock contested |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation — returns 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/cron/expire` | Release all expired PENDING reservations (cron-triggered) |

---

## Idempotency

The `/api/reservations` and `/api/reservations/:id/confirm` endpoints support the `Idempotency-Key` header.

On first request, the response is stored in Upstash Redis with a 24-hour TTL. Subsequent requests with the same key return the cached response without repeating the side effect.

This handles client retries safely — if a network timeout causes a double-submit, the customer won't be double-charged or double-reserved.

---

## Expiry Mechanism

Reservations expire via a Vercel Cron job (`GET /api/cron/expire`) that runs daily (Vercel Hobby tier limitation).

The endpoint finds all `PENDING` reservations where `expiresAt < now`, sets status to `RELEASED`, and decrements `stock.reserved`.

**In production I would:**
- Add **lazy expiry**: check `expiresAt` on every stock read and release inline — expired stock is reclaimed the moment someone tries to buy it, regardless of cron schedule
- Use **Redis keyspace notifications** with TTL set to the reservation window for near-instant release
- Keep the cron as a safety net, not the primary mechanism
- The confirm endpoint already handles this: it checks expiry before confirming and returns 410 + releases stock immediately if expired

---

## Running Locally

### Prerequisites
- Node.js 18+
- Neon or any hosted Postgres
- Upstash Redis

### Setup

```bash
git clone https://github.com/Mohit-Balachander/allo-inventory
cd allo-inventory
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Run migrations and seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

Start dev server:

```bash
npm run dev
```

Open http://localhost:3000

---

## Data Model

```prisma
Product     — id, name, description, imageUrl, price
Warehouse   — id, name, location
Stock       — productId, warehouseId, total, reserved  (unique per pair)
Reservation — productId, warehouseId, quantity, status, expiresAt, idempotencyKey
```

`available = total - reserved` is computed at read time, never stored.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 App Router | API routes as serverless functions, SSR |
| Database | Neon (Postgres) + Prisma 7 | Hosted Postgres, type-safe ORM |
| Locking | Upstash Redis | Distributed lock + idempotency cache |
| Validation | Zod | Shared schemas between API and frontend |
| UI | shadcn/ui + Tailwind | Fast, accessible components |
| Hosting | Vercel | Zero-config deployment + Cron |

---

## Trade-offs & What I'd Do Differently

**No authentication**: Reservations aren't tied to a user session. In production, checkout would require a logged-in user so reservations are scoped per customer.

**No payment webhook**: The Confirm button simulates payment success. Real integration would use a Stripe/Razorpay webhook to call the confirm endpoint server-side — the customer never directly confirms, the payment provider does.

**Cron granularity**: Vercel Hobby limits crons to daily. Redis keyspace notifications would give sub-second expiry. Lazy cleanup on read is the pragmatic middle ground.

**Single region**: Deployed to US-East for Vercel defaults. For India-first traffic, ap-south-1 (Mumbai) would cut latency significantly.

**No optimistic UI**: Stock counts refresh only after a completed action. WebSockets or Server-Sent Events would give real-time stock updates across all open sessions simultaneously.

**Race condition demo**: The Portable SSD 1TB is seeded with 1 unit per warehouse specifically to demonstrate the 409 race condition. Open two tabs, try to reserve the same unit — one succeeds, one gets "Not enough stock available".