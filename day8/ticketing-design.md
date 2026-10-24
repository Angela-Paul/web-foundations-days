# TicketHub Design

TicketHub sells tickets for concerts and events. The hard part is a big sale, when many people try to buy the same seats at once.

## 1. Requirements

**Functional:** browse events, view a seat map, hold seats for 5 minutes, pay, view my tickets, log in.

**Non-functional:**
- **Correctness:** a seat is never sold twice. This matters most.
- **Speed:** pages load in under 1 second, even in a big sale.
- **Fairness:** no queue jumping.
- **Availability:** the site stays up during a big sale.
- **Security:** HTTPS, login tokens, and payments through a provider so we never store payment details.

## 2. Estimates

One day is about 100,000 seconds. In the big sale I assume each person loads the seat map 5 times and tries to hold seats 2 times.

- **Normal day:** 50,000 x 10 pages = 500,000 views / 100,000 = **5 views per second** (25 at peak). 5,000 sales / 100,000 = **0.05 sales per second**.
- **Big sale (10 minutes = 600 seconds):** 200,000 / 600 = **333 arrivals per second**. Seat-map reads: 1,000,000 / 600 = **1,700 per second**. Hold attempts: 400,000 / 600 = **670 per second**. Sales: at most 20,000 / 600 = **33 per second**.
- **Comparison:** reads are about 330 times the normal level, but sales are capped by the 20,000 seats. The spike lasts minutes, so we use a waiting room, a cache and extra servers.

## 3. API

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/events` | List events | 200 |
| GET | `/events/{id}/seats` | Seat map with seat status | 200 |
| POST | `/events/{id}/holds` | Hold seats. Body: `{"seatIds": [12, 13]}` | 201 |
| DELETE | `/seats/{id}/hold` | Release my hold | 204 |
| POST | `/orders` | Pay for held seats | 201 |
| GET | `/orders` | List my tickets | 200 |

Errors: 400, 401, 402 payment failed, **409 seat already taken**, 410 hold expired.

## 4. Data model

- **users** (id PK, name, email UNIQUE, password_hash)
- **events** (id PK, name, venue, starts_at)
- **orders** (id PK, user_id FK, event_id FK, total, payment_ref UNIQUE)
- **seats** (id PK, event_id FK, label, price, status, held_by FK, hold_expires_at, order_id FK, UNIQUE on event_id and label)

One user has many orders, one event has many seats and orders, and one order has many seats. Each seat belongs to at most one order, so no join table is needed. Seat status is AVAILABLE, HELD or SOLD.

## 5. Preventing double-booking

Only the database decides who gets a seat. A hold is one atomic statement:

    UPDATE seats SET status = 'HELD', held_by = :user, hold_expires_at = :now_plus_5_min
    WHERE id = :seat AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < :now));

If one row changed, the seat is mine. If zero rows changed, someone else won and the API replies 409. The check and the update happen together, so no second buyer can slip in between. To pay, one transaction sets the seats to SOLD only if they are still held by this user and not expired. If any seat fails, everything is rolled back. Unique constraints (seat label per event, payment_ref) are the safety net. The cache and waiting room never decide who gets a seat.

## 6. Architecture

    Client --> DNS
       |-- static files --> CDN
       '-- API --> Waiting room --> Load balancer --> App servers 1..N
                                      |-- Cache
                                      |-- Primary DB --> Read replica
                                      |-- Queue --> Workers
                                      '-- Payment provider

- **DNS:** turns the site name into an address.
- **CDN:** serves static files near users, so the sale does not load our servers.
- **Waiting room:** admits users at a steady rate, so servers are not flooded and everyone is treated fairly.
- **Load balancer:** spreads requests so no server is overloaded.
- **App servers:** stateless, so we can add more before a sale.
- **Cache:** holds the seat map for a second or two, so reads skip the database.
- **Primary database:** handles all holds and sales so seat data stays correct.
- **Read replica:** answers browsing reads so they do not slow sales.
- **Queue and workers:** send tickets and release expired holds in the background.
- **Payment provider:** handles money, so we never store payment details.

**Surviving the big sale:** the waiting room limits arrivals, the CDN and cache absorb about 1,700 reads per second, and the database only handles about 33 sales per second.

## 7. Trade-offs

- **Hold time: time to pay vs seats released.** A 5-minute hold gives buyers time to pay, even with a slow M-Pesa prompt or a network drop. But if a buyer abandons checkout, the seat stays blocked until the hold expires, so other fans cannot buy it. A longer hold is kinder to slow payers but wastes seats. A shorter hold releases seats sooner but may cancel a buyer mid-payment. A worker releases expired holds, and the seat can be claimed again once its time is up.
- **Cached seat map: speed vs accuracy.** The cache is fast, but a user may click a seat that was just taken. The database rejects it with 409 and the page refreshes the map.
- **Waiting room: protection vs patience.** It protects the system and is fair, but users must wait and it is one more component to run.