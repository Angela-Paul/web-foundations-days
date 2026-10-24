# TicketHub Design

TicketHub sells tickets for concerts and events. The hard part is a big sale, when many people try to buy the same seats at once.

## 1. Requirements

**Functional:** browse events, view a seat map, hold seats for a few minutes, pay, view my tickets, register and log in.

**Non-functional:**
- **Correctness:** a seat is never sold twice. This matters more than speed.
- **Speed:** pages load in under 1 second, even in a big sale.
- **Fairness:** everyone gets a fair chance, with no queue jumping.
- **Availability:** the site stays up during a big sale.
- **Security:** HTTPS and login tokens. Payments go through a provider such as M-Pesa, and we never store payment details.

## 2. Estimates

One day is about 100,000 seconds. Assumptions: during the big sale each person loads the seat map 5 times and tries to hold seats 2 times.

**Normal day:** 50,000 visitors x 10 pages = 500,000 views / 100,000 = **5 views per second** (25 at peak, 5x). 5,000 sales / 100,000 = **0.05 sales per second**.

**Big sale (10 minutes = 600 seconds):**
- 200,000 users / 600 = about **333 new users per second**.
- 5 seat-map loads each: 1,000,000 / 600 = about **1,700 reads per second**.
- 2 hold attempts each: 400,000 / 600 = about **670 hold attempts per second**.
- At most 20,000 seats / 600 = about **33 sales per second**.

**Comparison:** reads are about 330 times higher than on a normal day (1,700 vs 5), and writes go from almost none to hundreds per second. The spike lasts only minutes, so we design for it with a waiting room, a cache and more servers.

## 3. API

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/events` | List upcoming events | 200 |
| GET | `/events/{id}/seats` | Seat map with each seat's status | 200 |
| POST | `/events/{id}/holds` | Hold seats for 5 minutes. Body: `{"seatIds": [12, 13]}` | 201 |
| DELETE | `/seats/{id}/hold` | Release my hold on a seat | 204 |
| POST | `/orders` | Pay for held seats. Body: `{"eventId": 1, "seatIds": [12, 13], "paymentRef": "abc"}` | 201 |
| GET | `/orders` | List my orders and tickets | 200 |

Errors: 400 bad request, 401 not logged in, 402 payment failed, **409 seat already taken**, 410 hold expired.

## 4. Data model

- **users** (id PK, name, email UNIQUE, password_hash)
- **events** (id PK, name, venue, starts_at)
- **orders** (id PK, user_id FK, event_id FK, total, status, payment_ref UNIQUE)
- **seats** (id PK, event_id FK, label, price, status, held_by FK to users, hold_expires_at, order_id FK to orders, UNIQUE on event_id and label)

Relationships: one user has many orders. One event has many seats and many orders. One order has many seats, and each seat belongs to at most one order. No join table is needed, because a seat can be sold only once. The seat `status` is AVAILABLE, HELD or SOLD.

## 5. Preventing double-booking

Only the database decides who gets a seat, using two atomic steps.

**Step 1: hold the seat.**

    UPDATE seats
    SET status = 'HELD', held_by = :user, hold_expires_at = :now_plus_5_min
    WHERE id = :seat
      AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < :now));

If one row changed, the seat is yours. If zero rows changed, someone else got it first and the API replies 409. The database runs two simultaneous updates one after the other, so only one can win. The check and the update happen in the same statement, so there is no gap for a second buyer to slip into.

**Step 2: pay.** In one transaction, set the seats to SOLD with `WHERE status = 'HELD' AND held_by = :user AND hold_expires_at > :now`. If the number of changed rows is not the number of seats, the transaction is rolled back and nothing is sold. The payment provider confirms the payment before the seats are marked SOLD.

Safety nets: each seat has one `order_id`, the seat label is unique for each event, and `payment_ref` is unique so one payment cannot be used twice. The cache and the waiting room only reduce load. They never decide who gets a seat.

## 6. Architecture

    Client
     |-- DNS --> address of the site
     |-- static pages, images --> CDN
     '-- API requests --> Waiting room (big sales only)
                              |
                         Load balancer
                              |
              App servers 1..N (stateless) --> Payment provider
                |          |         |
              Cache    Primary DB   Queue --> Workers
              (Redis)      |
                      Read replica

- **DNS:** turns the site's name into its address, so users do not need numbers.
- **CDN:** serves pages and images from servers near users, so the big sale does not hit our servers for static files.
- **Waiting room:** lets users into the sale at a steady rate, so the servers are not flooded and everyone gets a fair turn.
- **Load balancer:** spreads requests across app servers so none is overloaded.
- **App servers:** run the API and are stateless, so we can add more before a big sale.
- **Cache (Redis):** keeps a copy of the seat map for a second or two, so thousands of reads do not reach the database.
- **Primary database:** handles every hold and sale, so seat data stays correct.
- **Read replica:** answers browsing queries, so reads do not slow down holds and sales.
- **Queue and workers:** send tickets and receipts, and release expired holds, in the background so buyers do not wait.
- **Payment provider:** handles the money, so we never store payment details.

**How it survives the big sale:** the waiting room limits arrivals, the CDN and cache absorb about 1,700 reads per second, extra app servers handle the load, and the database only has to process about 33 sales per second, which one primary can do.

## 7. Trade-offs

- **Cached seat map: speed vs accuracy.** The cache is fast, but a user may click a seat that was just taken. The database rejects it with 409, and the page refreshes the map.
- **Seat holds: fairness vs unsold seats.** A 5-minute hold gives a buyer time to pay, but abandoned holds keep seats unavailable until they expire.
- **Waiting room: protection vs patience.** It protects the system and gives everyone a fair place, but users must wait, and it adds a component to run.
- **One primary database: correctness vs write scaling.** One primary keeps seat data simple and correct, but all writes go through it. At about 33 sales per second this is fine.