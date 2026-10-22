# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from the people they follow. This document estimates the load and plans how the system can handle it.

## 1. Assumptions

- There are 10 million registered users.
- 10% of registered users are active each day.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day, and each feed page counts as one feed view.
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail.
- One day is about 100,000 seconds (a rounded estimate that keeps the maths simple).
- Peak traffic is 5 times the average.
- Photos are kept forever, and there is no user growth during the year.
- Sizes use decimal units: 1 TB = 1,000,000 MB and 1 GB = 1,000 MB.

## 2. Daily active users

- 10,000,000 registered users x 10% = **1,000,000 daily active users (DAU)**

## 3. Estimates

### Uploads per second
- Uploads per day: 1,000,000 users x 1 photo = 1,000,000 uploads
- Average: 1,000,000 / 100,000 = **10 uploads per second**
- Peak (5x): 10 x 5 = **50 uploads per second**

### Feed views per second
- Feed views per day: 1,000,000 users x 50 views = 50,000,000 views
- Average: 50,000,000 / 100,000 = **500 feed views per second**
- Peak (5x): 500 x 5 = **2,500 feed views per second**

### Photo storage per year
- Originals per day: 1,000,000 x 2 MB = 2,000,000 MB = 2 TB
- Thumbnails per day: 1,000,000 x 50 KB = 50,000 MB = 50 GB
- Total per day: about 2.05 TB
- Total per year: 2.05 TB x 365 = about **748 TB (roughly 0.75 PB)**
  - Originals: 730 TB
  - Thumbnails: about 18 TB

## 4. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are 500 feed views per second but only 10 uploads per second on average, so reads outnumber writes about 50 to 1.

What this means for the design:
- Most of our effort should go into making reads fast and cheap: a CDN for photos, a cache for hot data, and a read replica of the database.
- Writes are rare and small (one database row plus one file per upload), so a single primary database can handle them for a long time.
- Read capacity can be scaled up by adding more caches and replicas, without changing how writes work.

## 5. Why photos are not stored in the database

- A database is built for small, structured rows, not for 2 MB files. At 748 TB per year, the database would become huge, slow and very expensive.
- Backups, restores and replication would have to copy all those photo files too, making every one of them much slower.
- A database cannot serve files to users as cheaply or as quickly as a CDN can.

Photos go in **object storage** (a service built to store large files cheaply and reliably, such as Amazon S3). The database stores only a small row for each photo, with the file's URL, the owner and the upload time.

## 6. Architecture diagram

```
Users (phones and browsers)
 |
 |-- photo and thumbnail requests --> CDN --(cache miss)--> Object storage
 |
 '-- API requests (feed, upload, follow)
          |
          v
   Load balancer
          |
          v
   App servers (stateless): App 1 | App 2 | App 3 | ...
          |
          +--> Cache (Redis)                fast reads of hot data
          |
          +--> Database (primary)           all writes
          |         |
          |         | copies data
          |         v
          +--> Database (read replica)      reads, such as the feed
          |
          +--> Object storage               saves the original photo
          |
          '--> Queue                        "make a thumbnail" jobs
                  |
                  v
               Worker --> reads the original photo from Object storage,
                          writes the 50 KB thumbnail back to Object storage
```

## 7. What each component does

- **CDN:** stores copies of photos and thumbnails on servers close to users, which solves slow image loading and takes most of the feed traffic off our own servers.
- **Load balancer:** spreads incoming requests across many app servers, which solves the problem of one server being overloaded and keeps the app running if one server fails.
- **App servers:** run the application code (login, upload, feed), and because they are stateless, we can add more of them whenever traffic grows.
- **Cache:** keeps frequently used data such as popular feeds in fast memory, which solves the problem of the database answering the same read thousands of times.
- **Database (primary):** stores users, follows and photo records, and handles every write so the data stays correct and consistent.
- **Read replica:** holds a copy of the primary database and answers read queries, which solves the problem of heavy read traffic overwhelming the primary.
- **Object storage:** stores the large photo files cheaply and reliably, which solves the problem that photos are too big and too many for a database.
- **Queue:** holds jobs such as "make a thumbnail" until a worker is free, which solves the problem of slow work making the user wait or being lost in busy periods.
- **Worker:** takes jobs from the queue and creates thumbnails in the background, which keeps the upload fast for the user.

## 8. Upload flow

1. The user chooses a photo in the app and sends it to SnapShare.
2. The load balancer passes the request to any available app server.
3. The app server checks the user's login token and validates the file (type and size).
4. The app server saves the original 2 MB photo in object storage.
5. The app server writes a row in the primary database with the photo id, the owner, the file's URL, the upload time, and a thumbnail status of "pending".
6. The app server adds a "create thumbnail for photo X" job to the queue.
7. The app server replies to the user straight away with 201 Created. It does not wait for the thumbnail.
8. A worker takes the job from the queue, reads the original photo from object storage, creates a 50 KB thumbnail, and saves it back to object storage.
9. The worker updates the database row with the thumbnail's URL and sets the status to "ready". If the worker fails, the job stays in the queue and is tried again.
10. The server invalidates the cached feeds of the uploader's followers, so their next feed load includes the new photo. The photo itself is then served to them through the CDN.

## 9. Trade-offs

- **Caching: speed vs fresh data.** A cache makes feeds load much faster and protects the database, but the cached copy can be out of date. We must invalidate it when data changes, and a mistake there can show users old content.
- **Read replica: scalability vs consistency.** The replica copies the primary with a small delay, so a user may upload a photo and not see it in the feed for a moment (eventual consistency). We can reduce this by reading a user's own recent data from the primary.
- **Queue and worker: fast uploads vs delayed thumbnails.** The upload responds quickly because the thumbnail is made in the background, but the thumbnail appears a few seconds later. The app must handle a photo whose thumbnail is not ready yet.
- **CDN and thumbnails: speed vs cost.** Thumbnails and the CDN make feeds fast and save bandwidth, but they add storage (about 18 TB a year) and CDN fees, and they add more parts to run and monitor.