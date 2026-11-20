# Project 4 (Track D, Socket.io) — changed files

Paths are relative to the repository root.

| Status | File | Reason |
|---|---|---|
| NEW | `server/socket/index.js` | Socket.io server, room join/leave with validation, `emitCommentNew` / `emitPhotoNew` / `emitPhotoDeleted` helpers |
| MODIFIED | `server/server.js` | Creates one http server for Express + Socket.io; `app` is still exported for the tests |
| MODIFIED | `server/controllers/commentController.js` | Emits `comment:new` after the comment is saved (same JSON as the REST response) |
| MODIFIED | `server/controllers/photoController.js` | Emits `photo:new` after upload and `photo:deleted` after delete |
| MODIFIED | `server/package.json` | Adds `socket.io`, dev `socket.io-client`; tests run with `--test-concurrency=1` (shared test DB) |
| NEW | `server/tests/socket.test.js` | Socket.io tests (rooms, isolation, validation, leave, payload equality, photo events) |
| MODIFIED | `client/package.json` | Adds `socket.io-client` |
| MODIFIED | `client/vite.config.js` | Proxies `/socket.io` with `ws: true` |
| NEW | `client/src/services/socket.js` | Single shared, reference-counted Socket.io connection |
| NEW | `client/src/useRealtime.js` | `usePhotoRoom` and `usePhotoFeed` hooks |
| NEW | `client/src/components/LiveStatus.jsx` | Live / Reconnecting indicator |
| NEW | `client/src/components/LiveNotifier.jsx` | Toast for photos uploaded by other users |
| MODIFIED | `client/src/hooks.js` | `setData` also accepts an updater function (no lost updates from rapid events) |
| MODIFIED | `client/src/pages/PhotoDetail.jsx` | Joins the photo room, de-duplicated live comments, resync, "photo deleted" notice, indicator |
| MODIFIED | `client/src/pages/Gallery.jsx` | Live add/remove of photo cards |
| MODIFIED | `client/src/pages/Home.jsx` | Live add/remove of photos and stats |
| MODIFIED | `client/src/components/PhotoCard.jsx` | Optional `highlight` prop for live-arrived cards |
| MODIFIED | `client/src/components/Navbar.jsx` | "Hi <firstName>" and "Please Login" as required |
| MODIFIED | `client/src/App.jsx` | Mounts `LiveNotifier` |
| MODIFIED | `client/src/styles/main.css` | Styles for the indicator, info toast, highlighted card |
| MODIFIED | `README.md` | Adds the "Project 4 — Track D" section (existing content kept) |

Not included: `package-lock.json` files. Run `npm install` in `server/` and `client/` once; npm updates both lock files — commit them.
