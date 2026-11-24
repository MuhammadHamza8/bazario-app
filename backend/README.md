# Bazario Backend

Learning project: the backend for **Bazario**, a classifieds marketplace app (buy and sell used items).
Built step by step to learn how a backend works.

## Stack

| Tool | Purpose |
|---|---|
| Node.js + Express 4 | HTTP server and routing |
| TypeScript | Typed JavaScript |
| MongoDB + Mongoose | Database and models |
| Zod | Validates config and request data |
| Helmet, CORS | Security headers, cross-origin access |
| tsx | Runs TypeScript directly in development |

| JWT (jsonwebtoken) | Short-lived access tokens |
| bcryptjs | Password hashing |
| Nodemailer | Sends the reset email |
| ioredis (Redis) | Optional cache for the feed and categories |
| Multer | Receives uploaded images (saved to local `uploads/`) |

Later steps add: Redis rate limiting (cache and rate limits).

## Setup

1. Install Node.js 20+ and MongoDB (local) or create a free MongoDB Atlas (M0) cluster.
2. Install and configure:
   ```bash
   npm install
   cp .env.example .env     # then edit MONGO_URI if needed
   ```
3. Run:
   ```bash
   npm run dev              # development, restarts on file changes
   npm run build && npm start   # production
   ```
4. Seed the categories once: `npm run seed`
5. Test: open `http://localhost:5000/api/v1/health`. It should return `"database": "connected"`.

## Folder structure

```
src/
  server.ts          Entry point: connect DB, start listening, graceful shutdown
  app.ts             Builds the Express app and registers middlewares in order
  config/
    env.ts           Reads and validates .env
    db.ts            MongoDB connection
  routes/
    index.ts         Combines all feature routes under /api/v1
    health.routes.ts Health check
  middlewares/
    validate.ts      Checks request data with Zod
    notFound.ts      404 for unknown routes
    errorHandler.ts  One place that turns every error into a JSON response
  utils/
    AppError.ts      Error with an HTTP status code
    asyncHandler.ts  Forwards async errors to the error handler
  modules/
    users/user.model.ts      User schema
    auth/                    session.model, auth.schema (validation), auth.service (logic),
                             auth.controller (HTTP), auth.routes,
                             passwordReset.model, password.service
    categories/              category model, controller, routes
    uploads/                 Multer config, controller, routes
    listings/                listing.model, schema, service, controller, routes,
                             feed.query (filters + cursor logic)
  scripts/seed.ts            Fills the categories (npm run seed)
  utils/cache.ts             Redis cache helpers (optional)
  utils/cursor.ts            Encode/decode pagination cursors
  utils/slug.ts              "Islamabad City" -> "islamabad-city"
  utils/mailer.ts            Email sending (Ethereal fake inbox in dev)
  utils/tokens.ts            JWT and refresh-token helpers
  middlewares/authenticate.ts  Protects routes that need a login
uploads/             Locally stored images (later step)
```

From Step 2 onward each feature is a folder in `src/modules/<name>/` containing
`model` (database shape), `schema` (validation), `service` (business logic),
`controller` (HTTP in/out) and `routes`.

## How a request flows

```
Client -> helmet -> cors -> express.json -> route -> validate -> controller -> service -> model -> MongoDB
                                                       |
                                  any error ----------> errorHandler -> JSON error response
```

## Authentication (Step 2)

| Method | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `name, email, password, intent ("buy"/"sell"), acceptTerms: true` | no |
| POST | `/api/v1/auth/login` | `email, password` | no |
| POST | `/api/v1/auth/refresh` | `refreshToken` | no |
| POST | `/api/v1/auth/logout` | `refreshToken` | no |
| GET | `/api/v1/auth/me` | - | `Authorization: Bearer <accessToken>` |

How it works:
1. Register/login returns an **access token** (JWT, 15 min) and a **refresh token** (random string, 7 days).
2. The app sends the access token in the `Authorization` header on every request.
3. When it expires (401), the app calls `/auth/refresh` to get a new pair. The old refresh token is deleted (rotation).
4. Passwords are stored as bcrypt hashes; refresh tokens as SHA-256 hashes.

## Forgot / reset password (Step 3)

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/v1/auth/forgot-password` | `email` |
| POST | `/api/v1/auth/reset-password` | `token, password, confirmPassword` |

How it works:
1. `forgot-password` creates a random token, stores its **hash** (valid 30 min), and emails a link containing the raw token.
2. It always returns the same message, so it cannot be used to find out which emails are registered.
3. `reset-password` checks the token, rejects the new password if it matches the current or last 5 passwords, saves it, and logs the user out of all devices.
4. Each token works once.

Email in development: with `SMTP_HOST` empty, the console prints an **Ethereal preview URL** (a free fake inbox). Open it to see the email and copy the token from the link. If offline, the email text is printed instead.
To send real emails, fill `SMTP_*` in `.env` (e.g. Gmail with an app password).

## Categories, uploads, listings (Step 4)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/categories` | no | Run `npm run seed` first |
| POST | `/api/v1/uploads/images` | yes | `multipart/form-data`, field `images`, max 8 files, 5 MB each, JPG/PNG/WebP. Returns `urls` |
| POST | `/api/v1/listings` | yes | `title, categorySlug, price, condition (new/like_new/used), city, images[], description?` |
| GET | `/api/v1/listings/mine` | yes | The user's own listings |
| GET | `/api/v1/listings/:id` | no | Detail + seller. Counts a view |
| PATCH | `/api/v1/listings/:id` | yes (owner) | Send only changed fields; `status` can be `active` or `sold` |
| DELETE | `/api/v1/listings/:id` | yes (owner) | Soft delete (status becomes `removed`) |

Create-listing flow:
1. The app uploads the chosen photos to `/uploads/images` and gets back URLs like `/uploads/ab12....jpg`.
2. It sends those URLs, with the form fields, to `POST /listings`. The first image is the cover.
3. Images are served at `http://localhost:5000/uploads/<file>`. The app adds the server address in front of the URL.

Notes:
- Only URLs generated by our upload endpoint are accepted as listing images.
- Photos uploaded but never attached to a listing stay on disk. A cleanup job can remove them later.
- Local disk storage is for learning; production apps use S3/Cloudinary so files survive redeploys.

## Feed, search, filters (Step 5)

`GET /api/v1/listings` (public). All parameters are optional:

| Param | Example | Meaning |
|---|---|---|
| `q` | `iphone` | Text search in title and description (whole words) |
| `category` | `vehicles` | Category slug |
| `city` | `Lahore` | City name |
| `condition` | `used` | `new`, `like_new`, `used` |
| `minPrice`, `maxPrice` | `1000`, `5000` | Price range (PKR) |
| `sort` | `newest` (default), `price_asc`, `price_desc` | Order |
| `limit` | `20` (default, max 50) | Page size |
| `cursor` | from the previous response | Next page |

Response: `{ items: [...], nextCursor, hasMore }`. Pass `nextCursor` as `cursor` to get the next page; stop when `hasMore` is false.

Why a cursor and not `skip`: it stays fast on deep pages and never shows duplicates when new listings arrive.

### Redis cache (optional)

1. Start Redis in WSL: `sudo service redis-server start` (check with `redis-cli ping` -> `PONG`).
2. Set `REDIS_URL=redis://127.0.0.1:6379` in `.env` and restart.
3. `/api/v1/health` now shows `"cache": "connected"`.

Without Redis everything still works. Feed results are cached 60 s per unique query, categories 10 min. Any create/update/delete of a listing bumps a version number inside the cache keys, so old cached feeds are never used again.
To watch it: `redis-cli monitor` while calling the feed twice.

## Response format

```json
{ "success": true,  "data": { } }
{ "success": false, "message": "What went wrong", "errors": [] }
```

## Roadmap

- [x] **Step 1** Foundation: config, DB, error handling, health route
- [x] **Step 2** Auth: register, login, JWT access and refresh tokens
- [x] **Step 3** Forgot and reset password (email link)
- [x] **Step 4** Categories and listings (with local image upload)
- [x] **Step 5** Feed: pagination, search, filters
- [ ] **Step 6** Favourites
- [ ] **Step 7** Google/Apple login, Redis caching and rate limiting
