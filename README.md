# Alzikrayat — MERN Edition

A full-stack photo-sharing web application (*Alzikrayat* = "our memories") built with **MongoDB, Express, React and Node.js**.
Advanced Web Technologies — Course Project 3 / Software Maintenance — Final Project.

## Purpose

Alzikrayat gives a small community one place to share photos and talk about them. It was originally a PHP/MySQL (MVC) application; this edition rebuilds it with the MERN stack and a REST API, so the React front end and the Express back end are fully separated and communicate only through JSON.

## Key features

- **Accounts:** register and log in; passwords are hashed with bcrypt and sessions use JWT.
- **Gallery:** a responsive grid of all photos with title, description, author, date and comment count.
- **Photo upload:** multipart/form-data upload (JPEG, PNG, GIF, WEBP, max 5 MB) with server-side validation of the file's real content.
- **Photo details and comments:** every photo has its own page where logged-in users can comment; comments are stored with their photo and author.
- **Safe deletion:** only the owner can delete a photo (others get HTTP 403); deleting also removes the photo's comments and image file.
- **Validation and error handling:** Joi validation on every request, central error handler, consistent JSON responses.
- **Feedback everywhere:** loading spinners, empty states, error messages and success notifications.

## Contributors

| Name | Role |
|---|---|
| **Mohammed NoorAldeen Mohammed * | Server foundation (models, authentication), client foundation (routing, API service, styles), documentation |
| **Ahmed AbdAlkarem Ahmed** | Photos and comments API (upload, delete, tests), client pages and components |

*(Replace the names and roles above with the real team members.)*

## Git workflow used in this repository

- `main` always holds working, tested code.
- Each significant change is developed on its own branch (`docs/...`, `feature/...`, `fix/...`) and merged into `main` with a merge commit.
- Commit messages follow the `type(scope): summary` convention (`feat`, `fix`, `docs`, `test`, `chore`, `style`).

## Getting the code

```bash
git clone git@github.com:<your-username>/alzikrayat-mern.git
cd alzikrayat-mern
```

## Tech stack

| Layer | Technology |
|---|---|
| Database | MongoDB (local or Atlas) + Mongoose schemas |
| API | Node.js + Express (hand-written routes, controllers, middleware) |
| Validation | Joi (request bodies) + Mongoose schema rules |
| Security | bcrypt password hashing, JWT authentication |
| Uploads | Multer (disk storage in `server/uploads/`) |
| Frontend | React 19 (functional components + hooks), React Router, Vite, plain CSS |

No Next.js, Remix, NestJS, Prisma, Sequelize or pre-built admin dashboards are used.

## Project structure

```
alzikrayat-mern/
├── server/
│   ├── config/db.js              # MongoDB connection (separate from routes)
│   ├── models/                   # User.js, Photo.js, Comment.js
│   ├── routes/                   # authRoutes.js, photoRoutes.js, commentRoutes.js
│   ├── controllers/              # authController.js, photoController.js, commentController.js
│   ├── middleware/               # validation.js (Joi + ObjectId), errorHandler.js,
│   │                             # auth.js (JWT guard), upload.js (Multer + image checks)
│   ├── tests/api.test.js         # automated end-to-end API tests
│   ├── uploads/                  # stored image files (git-ignored except .gitkeep)
│   ├── .env.example
│   └── server.js                 # Express entry point
└── client/
    ├── src/
    │   ├── components/           # Navbar, PhotoCard, CommentForm, CommentList, LoginForm,
    │   │                         # RegisterForm, UploadForm, ProtectedRoute, Feedback
    │   ├── pages/                # Home, Gallery, PhotoDetail, LoginRegister, Upload, NotFound
    │   ├── context/              # AuthContext, ToastContext
    │   ├── services/api.js       # fetch wrapper for the REST API
    │   ├── styles/main.css
    │   ├── App.jsx               # React Router configuration
    │   └── main.jsx
    ├── index.html
    └── vite.config.js            # dev proxy to Express
```

## Prerequisites

- **Node.js 18+** (developed on Node 22) and npm
- **MongoDB**: either a local MongoDB server (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/docs/atlas/) cluster

## Setup and run

```bash
# 1. Backend
cd server


cp .env.example .env        # then edit .env (see table below)
npm run dev                 # API on http://localhost:5000  (or: npm start)

# 2. Frontend (second terminal)
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

Open **http://localhost:5173**. Vite proxies `/api/*` and `/uploads/*` to Express, so the React code needs no backend URL and no CORS setup in development.

### Environment variables (`server/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Express port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/alzikrayat` or your Atlas `mongodb+srv://…` URI |
| `JWT_SECRET` | Secret used to sign login tokens — use a long random value | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_ORIGIN` | Allowed CORS origin (needed only when the client is not served through the Vite proxy) | `http://localhost:5173` |
| `NODE_ENV` | `development` / `production` | `development` |

`server/.env` is git-ignored; only `.env.example` (placeholders) is committed. The client has an optional `VITE_API_URL` (see `client/.env.example`) for deployments where the API is on another origin. It contains no secrets.

**Atlas notes:** create a database user, add your IP under *Network Access*, and put the connection string (with the password URL-encoded) in `MONGODB_URI`.

### Production build

```bash
cd client && npm run build      # outputs client/dist
```
Serve `client/dist` from any static host. Set `VITE_API_URL` at build time to the API's URL, and set `CLIENT_ORIGIN` on the server to the site's URL.

## Authentication design (decision)

The PDF does not mandate a strategy. I chose **bcrypt + JWT (Bearer token)**:

- The React app is a separate SPA, so a stateless token avoids server sessions and cross-origin cookie configuration.
- `POST /api/auth/login` and `/register` return a signed token; the client sends `Authorization: Bearer <token>` on protected requests.
- The server derives the caller's identity **only from the verified token** (`req.userId`), never from request data. Ownership checks use that value.
- Passwords are hashed with bcrypt (10 rounds); the hash is `select: false` and stripped from all JSON output. Login errors are identical for "unknown email" and "wrong password" and take similar time (dummy-hash comparison).
- Trade-off: the token is kept in `localStorage`, which is readable by JavaScript if the site had an XSS bug. React escapes all rendered text and no `dangerouslySetInnerHTML` is used. A production system might prefer httpOnly cookies.

The "Last login from this computer was …" reminder from the original app is kept (stored in `localStorage`, expires after 7 days).

## REST API

All responses are JSON: `{ "success": true, … }` or `{ "success": false, "message": "…", "errors": ["…"] }`.

| Method | Endpoint | Auth | Description | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | – | Body: `firstName, lastName, email, password` (+ optional `location, occupation, description`). Returns `{ token, user }` | 201 | 400 validation, 409 email exists |
| POST | `/api/auth/login` | – | Body: `email, password`. Returns `{ token, user }` | 200 | 400, 401 |
| GET | `/api/photos` | – | All photos, newest first, with author and `commentCount` → `{ count, photos }` | 200 | – |
| GET | `/api/photos/:id` | – | One photo **plus its comments** (with authors) → `{ photo, comments }` | 200 | 400 bad id, 404 |
| POST | `/api/photos` | ✔ | `multipart/form-data`: `photo` (file), `title`, `description`. → `{ photo }` | 201 | 400 (validation / not an image), 401, 413 (>5 MB) |
| DELETE | `/api/photos/:id` | ✔ | Owner only. Also deletes the photo's comments and its file | 200 | 400, 401, **403 not owner**, 404 |
| POST | `/api/photos/:id/comments` | ✔ | Body: `comment` (1–1000 chars) → `{ comment }` | 201 | 400, 401, 404 |
| GET | `/api/health` | – | Liveness check | 200 | – |

No extra endpoint was needed to list comments: `GET /api/photos/:id` returns them.

**Upload rules:** JPEG, PNG, GIF or WEBP, max 5 MB. The server checks the MIME type *and* the file's real signature (magic bytes), stores it under a random generated name (client filename is ignored), and removes the file if validation or the database write fails.

## Data model (Mongoose)

- **User** — `_id, firstName, lastName, email (unique, lowercase, format-checked), password (bcrypt hash), location?, occupation?, description?`
- **Photo** — `_id, userId → User, fileName, title (≤200), description (≤2000), dateTime`
- **Comment** — `_id, photoId → Photo, userId → User, comment (≤1000), dateTime`

MongoDB has no foreign-key cascade, so deleting a photo removes its comments in the controller (same behaviour as the SQL `ON DELETE CASCADE` in the PHP version).

## Testing

**Automated API tests** (real Express app + real MongoDB, using a separate `alzikrayat_test` database that is dropped afterwards):

```bash
cd server
npm test            # needs MongoDB running; set TEST_MONGODB_URI to override
```

The 15 tests cover registration (hashing, duplicates, validation, malformed JSON), login (wrong password, unknown email), upload (auth, valid file, wrong MIME, spoofed content, oversize, missing file/title, no orphan files), listing/detail (bad id, unknown id), comments (auth, validation, 404, persistence with author) and deletion (401, 403 for non-owner, 400/404, owner success including comment and file cleanup).

**Manual demo checklist:** register two users → upload a photo as user A → comment as user B → confirm user B has no *Delete* button on A's photo → delete as A → confirm the photo disappears from the gallery. Shrink the browser to ~375 px to see the mobile layout.

## Assignment compliance checklist

| Requirement (from the PDF) | Status |
|---|---|
| REST routes with correct methods/status codes (`GET/POST /api/photos`, `GET/DELETE /api/photos/:id`, `POST /api/auth/register`, `/login`, `POST /api/photos/:id/comments`) | ✔ `server/routes/*` |
| User, Photo, Comment Mongoose schemas with references and validation | ✔ `server/models/*` |
| bcrypt password hashing; `.env` for MongoDB URI, excluded from Git | ✔ `.gitignore`, `.env.example` |
| Register/Login works end-to-end | ✔ |
| Upload stores file + metadata; delete verifies ownership | ✔ Multer + MongoDB; 403 for non-owners |
| Photo Detail uses React Router/`useParams` and displays comments | ✔ `pages/PhotoDetail.jsx` |
| Responsive Gallery uses `useEffect` + fetch | ✔ `hooks.js` (`useAsync`) + `pages/Gallery.jsx` |
| Server-side Joi validation, middleware, centralized error handling | ✔ `middleware/validation.js`, `errorHandler.js` |
| Vite dev proxy to Express | ✔ `client/vite.config.js` |
| Loading, empty, error and success states | ✔ spinner, empty states, alerts, toasts |
| README explains setup and environment variables | ✔ this file |
| No Next/Remix/NestJS/Prisma/Sequelize/admin dashboards | ✔ |
| GitHub with meaningful commit history for `/client` and `/server` | ✔ one commit per feature area |

---

# Project 4 — Track D: Real-Time WebSocket (Socket.io)

## Selected track and rationale

I chose **Track D (Socket.io)** because the app already has the exact use case it is made for: several people look at the same photo and talk about it in the comments. Before, a comment appeared only after a reload; now it appears instantly for everybody viewing that photo. The feature also fits the existing architecture without touching the data tier: the REST API stays the single write path, and Socket.io only *announces* what the API has already saved.

Implemented: Socket.io server on the same HTTP server as Express, `comment:new` broadcast per photo room, the optional live `photo:new` notification (toast + the card appears in Gallery/Home), `photo:deleted`, a `socket.io-client` connection in React (`useEffect`), room-based broadcasting, and a "Live / Reconnecting…" indicator.

## Architecture

```
Browser A ──POST /api/photos/:id/comments──▶ Express ─▶ Joi + JWT ─▶ MongoDB
                                                  │ (saved OK)
                                                  ▼
                                   emitCommentNew()  (server/socket/index.js)
                                                  │  io.to("photo:<id>")
                         ┌────────────────────────┴───────────────┐
                         ▼                                        ▼
                  Browser A (room)                         Browser B (room)
          already has it from REST -> de-duplicated        appends it, no reload
```

Design decisions:

- **REST is the only write path.** Clients never create comments or photos through the socket (the server has no such handler). Validation, JWT authentication and ownership rules therefore exist in one place only. Controllers emit **after** the database write succeeded, so a failed request (400/401/403/404) never produces an event.
- **One room per photo:** `photo:<photoId>`. Clients send `photo:join` / `photo:leave`; the server validates the id (24-hex ObjectId), lower-cases it, ignores or rejects invalid ones through the acknowledgement, and limits a socket to 10 photo rooms.
- **Anonymous read-only subscription.** Reading is public in this app, so sockets need no login. No JWT is read in the handshake: the `photo:new` payload already contains the uploader's id, so the client can skip its own toast without the server trusting anything from the client. No `userId` sent by a client is ever used.
- **Failure isolation.** Emitting is wrapped in `try/catch` and does nothing when Socket.io is not initialised, so REST works exactly as before if sockets fail.

### Events

| Event | Direction | Payload | Room / audience |
|---|---|---|---|
| `photo:join` | client → server | `photoId` (string) + optional ack callback → `{ ok, room }` or `{ ok:false, error }` | joins room `photo:<photoId>` |
| `photo:leave` | client → server | `photoId` + optional ack → `{ ok }` | leaves that room |
| `comment:new` | server → client | the same comment JSON as the REST `POST /api/photos/:id/comments` response: `{ _id, photoId, comment, dateTime, user:{ _id, firstName, lastName } }` | only room `photo:<photoId>` |
| `photo:new` | server → client | the same photo JSON as the REST `POST /api/photos` response (`_id, userId, user, imageUrl, title, description, dateTime, commentCount`) | **all** connected clients |
| `photo:deleted` | server → client | `{ photoId }` | **all** connected clients (the photo's room is emptied afterwards) |

*Rooms vs namespaces vs broadcast:* a **namespace** is a separate endpoint (e.g. `/admin`) with its own connection logic; a **room** is a server-side group inside one namespace that sockets join/leave; **broadcast** (`io.emit`) goes to everybody. This project uses the default namespace, rooms for comments and broadcast for photo events.

## Client side

| File | Role |
|---|---|
| `client/src/services/socket.js` | One shared connection with a reference counter (no duplicates under `React.StrictMode`; closed when nobody uses it) |
| `client/src/useRealtime.js` | `usePhotoRoom(photoId, handlers)` (join/leave room, `comment:new`, status, resync) and `usePhotoFeed(handlers)` (`photo:new`, `photo:deleted`) |
| `client/src/components/LiveStatus.jsx` | "Live" / "Connecting…" / "Reconnecting…" indicator |
| `client/src/components/LiveNotifier.jsx` | Toast when *someone else* uploads a photo, on any page |
| `client/src/pages/PhotoDetail.jsx` | Uses the room hook; de-duplicates by comment `_id` |
| `client/src/pages/Gallery.jsx`, `Home.jsx` | New photo appears at the top (highlighted); deleted photo disappears |

- **No duplicates:** the author receives the comment from the REST response *and* from the event; both go through the same `addComment`, which ignores an `_id` that is already in the list.
- **Cleanup:** on unmount (or when the photo id changes) the effect removes every listener, emits `photo:leave` and releases the socket; the connection closes 300 ms after the last user released it.
- **Reconnection:** rooms are lost when a connection drops, so the hook re-joins on every `connect` event. After a *re*-join it re-fetches the photo over REST to recover comments missed while offline.
- **Socket unavailable:** the indicator shows "Reconnecting…" while the page keeps working over REST; nothing throws.
- **Known limitation:** comment counters on gallery cards are not live (they refresh on the next load).

## Setup for the new technology

```bash
cd server && npm install        # adds socket.io (and socket.io-client for tests)
cd ../client && npm install     # adds socket.io-client
```

## Environment variables

No new variables. Socket.io reuses the existing ones:

| Variable | Used for |
|---|---|
| `CLIENT_ORIGIN` (server) | Allowed origin for both REST CORS **and** the Socket.io handshake |
| `VITE_API_URL` (client, optional) | If set, the socket connects to that URL instead of the current origin (same as `api.js`) |

In development the Vite proxy forwards `/socket.io` (with `ws: true`), so no backend URL is hard-coded.

## Run the full stack

```bash
# terminal 1 - MongoDB must be running
cd server && npm run dev        # API + Socket.io on http://localhost:5000
# terminal 2
cd client && npm run dev        # http://localhost:5173
```

Try it: open the same photo in two browsers (or one normal + one private window), log in as two users, post a comment in one — it appears in the other without a reload, and the pill above the comments says **Live**. Stop the server to see **Reconnecting…**; start it again and it returns to **Live**.

## How to test

```bash
cd server
npm test        # API tests + Socket.io tests, run one file at a time (--test-concurrency=1)
```

`tests/socket.test.js` (real Express + Socket.io + MongoDB + `socket.io-client`) covers: two clients in one room both get `comment:new` with a payload identical to the REST response; a client in another room / no room gets nothing; invalid ids are rejected; case-insensitive room ids; a client that left stops receiving; the 10-room limit; events sent by clients are ignored (REST is the only write path); failed REST writes emit nothing; `photo:new` reaches every client and equals the REST payload; `photo:deleted` is broadcast and the room emptied; a forbidden delete emits nothing. The existing API tests run unchanged (they use an app without Socket.io, which also proves REST works without it).

## Project 4 compliance checklist

| Requirement | Status |
|---|---|
| Socket.io server integrated with Express (same HTTP server) | ✔ `server/server.js`, `server/socket/index.js` |
| New comment appears instantly for all connected clients | ✔ `comment:new` |
| (Optional) live notification on photo upload | ✔ `photo:new` toast + live card in Gallery/Home |
| Client connection in React via `useEffect` | ✔ `useRealtime.js`, `services/socket.js` |
| Room-based broadcasting per photo detail page | ✔ room `photo:<id>` |
| Cleanup on unmount, multiple simultaneous clients | ✔ listeners removed, room left, ref-counted socket |
| Project 3 features still work | ✔ REST untouched; sockets are additive |
| Toolbar shows "Hi <firstName>" / "Please Login" | ✔ `Navbar.jsx` |
| 3-tier architecture, data tier unchanged | ✔ no model changes |
| No meta-frameworks; hand-written integration | ✔ |
| Secrets only in `.env`; validation maintained | ✔ no new secrets; Joi/JWT still guard every write |
| New UI is responsive | ✔ indicator wraps in `.section-head`, toasts limited to viewport width |
| README: track, rationale, setup, env variables, how to run | ✔ this section |
| Meaningful Git history on branch `feature/websocket-comments` | ✔ one commit per area |
