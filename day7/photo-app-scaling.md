# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10,000,000 registered users, 10% active each day.
- Each active user uploads 1 photo and views 50 feed pages per day.
- A photo is 2 MB and its thumbnail is 50 KB.
- One day is about 100,000 seconds. Peak traffic is 5 times the average.
- 1 TB = 1,000,000 MB.
- Daily active users (DAU): 10,000,000 x 10% = **1,000,000**.

## 2. Estimates

- **Uploads per second:** 1,000,000 / 100,000 = **10 average**, 10 x 5 = **50 peak**.
- **Feed views per second:** (1,000,000 x 50) / 100,000 = **500 average**, 500 x 5 = **2,500 peak**.
- **Storage per year:** originals 2 TB per day plus thumbnails 50 GB per day, about 2.05 TB per day, x 365 = about **748 TB per year**.

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**: 500 feed views per second against 10 uploads per second, about 50 to 1. So the design focuses on fast reads: a CDN, a cache and a read replica. Writes are few and small, so one primary database can handle them.

## 4. Why photos are not stored in the database

A 2 MB photo is too big for a database. 748 TB a year would make it huge, slow and expensive, and every backup and copy would carry the photos too. Photos go in **object storage**, which is built for large files. The database keeps only a small row with the photo's URL, owner and upload time.

## 5. Architecture

    Users
     |-- photos and thumbnails --> CDN --(miss)--> Object storage
     |
     '-- API requests --> Load balancer --> App servers (stateless)
                                              |
                                              +--> Cache
                                              +--> Database primary --> Read replica
                                              +--> Object storage (originals)
                                              '--> Queue --> Worker --> Object storage (thumbnails)

                                             ## 6. Components

- **CDN:** serves photos from servers near users, so images load fast and our servers carry less traffic.
- **Load balancer:** spreads requests across app servers, so no single server is overloaded.
- **App servers:** run the app code and are stateless, so we can add more when traffic grows.
- **Cache:** keeps hot data such as popular feeds in fast memory, so the database is asked less often.
- **Database (primary):** stores users, follows and photo records, and handles all writes.
- **Read replica:** a copy of the primary that answers read queries, so heavy reads do not overload the primary.
- **Object storage:** stores the large photo files cheaply and reliably.
- **Queue:** holds "make a thumbnail" jobs, so slow work does not make the user wait.
- **Worker:** takes jobs from the queue and makes thumbnails in the background.

## 6. Components

- **CDN:** serves photos from servers near users, so images load fast and our servers carry less traffic.
- **Load balancer:** spreads requests across app servers, so no single server is overloaded.
- **App servers:** run the app code and are stateless, so we can add more when traffic grows.
- **Cache:** keeps hot data such as popular feeds in fast memory, so the database is asked less often.
- **Database (primary):** stores users, follows and photo records, and handles all writes.
- **Read replica:** a copy of the primary that answers read queries, so heavy reads do not overload the primary.
- **Object storage:** stores the large photo files cheaply and reliably.
- **Queue:** holds "make a thumbnail" jobs, so slow work does not make the user wait.
- **Worker:** takes jobs from the queue and makes thumbnails in the background.

## 7. Upload flow

1. The user sends a photo and the load balancer passes it to an app server.
2. The app server checks the login token and the file type and size.
3. It saves the 2 MB original in object storage.
4. It writes a row in the primary database with the owner, the URL and thumbnail status "pending".
5. It adds a "make thumbnail" job to the queue.
6. It replies to the user at once with 201 Created.
7. A worker takes the job, reads the original, makes a 50 KB thumbnail and saves it in object storage.
8. The worker updates the database row with the thumbnail URL and sets the status to "ready". If the worker fails, the job is tried again.
9. The cached feeds of the uploader's followers are cleared, so their next load shows the photo.

## 8. Trade-offs

- **Cache: speed vs fresh data.** Feeds load faster, but cached data can be stale, so we must clear it when data changes.
- **Read replica: scalability vs consistency.** The replica copies the primary with a small delay (replication lag), so a new upload may not show in the feed right away.
- **Queue and worker: fast uploads vs delayed thumbnails.** Uploads reply quickly, but the thumbnail appears a few seconds later (eventual consistency), so the app must handle a photo with no thumbnail yet.
- **CDN and thumbnails: speed vs cost.** They speed up the feed but add storage and CDN fees, and more parts to run. 