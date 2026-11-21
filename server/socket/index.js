// Socket.io layer for Alzikrayat (Project 4, Track D).
//
// Design rule: sockets are a ONE-WAY notification channel (server -> browsers).
// Every write still goes through the REST API, so Joi validation, JWT auth and
// the ownership checks live in exactly one place. Controllers call the emit*
// helpers below only AFTER the database write has succeeded.
const { Server } = require('socket.io');

const ROOM_PREFIX = 'photo:';
const MAX_PHOTO_ROOMS_PER_SOCKET = 10; // stops one client from hoarding rooms
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

let io = null; // set by initSocket(); stays null when the app runs without sockets (e.g. REST-only tests)

// Ids are lower-cased so "ABC..." and "abc..." can never end up in two rooms.
const isPhotoId = (value) => typeof value === 'string' && OBJECT_ID.test(value);
const roomFor = (photoId) => `${ROOM_PREFIX}${String(photoId).toLowerCase()}`;
const photoRoomCount = (socket) => [...socket.rooms].filter((r) => r.startsWith(ROOM_PREFIX)).length;

/**
 * Attaches Socket.io to an existing http.Server (the same one Express runs on)
 * and registers the room handlers. Returns the Server instance.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    // Same allow-list the REST API uses, so one env variable controls both.
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST'] },
    serveClient: false,      // the React app bundles socket.io-client itself
    maxHttpBufferSize: 1e4,  // clients only send tiny join/leave messages
  });

  io.on('connection', (socket) => {
    // Every payload coming from the browser is untrusted: validate before use.
    socket.on('photo:join', (photoId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (!isPhotoId(photoId)) return reply({ ok: false, error: 'Invalid photo id' });

      const room = roomFor(photoId);
      if (!socket.rooms.has(room) && photoRoomCount(socket) >= MAX_PHOTO_ROOMS_PER_SOCKET) {
        return reply({ ok: false, error: 'Too many rooms joined' });
      }
      return Promise.resolve(socket.join(room)).then(() => reply({ ok: true, room }));
    });

    socket.on('photo:leave', (photoId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (!isPhotoId(photoId)) return reply({ ok: false, error: 'Invalid photo id' });
      return Promise.resolve(socket.leave(roomFor(photoId))).then(() => reply({ ok: true }));
    });
    // Any other event name from a client is simply ignored (no handler registered).
  });

  return io;
}

// A failed notification must never turn a successful REST write into an error.
function safeEmit(fn) {
  if (!io) return;
  try {
    fn();
  } catch (err) {
    console.error('[socket] emit failed:', err.message);
  }
}

/** comment:new -> only the sockets viewing that photo. `comment` = the REST comment JSON. */
function emitCommentNew(comment) {
  safeEmit(() => io.to(roomFor(comment.photoId)).emit('comment:new', comment));
}

/** photo:new -> every connected client. `photo` = the REST photo JSON. */
function emitPhotoNew(photo) {
  safeEmit(() => io.emit('photo:new', photo));
}

/** photo:deleted -> every connected client; then the now-pointless room is emptied. */
function emitPhotoDeleted(photoId) {
  safeEmit(() => {
    io.emit('photo:deleted', { photoId: String(photoId) });
    io.in(roomFor(photoId)).socketsLeave(roomFor(photoId));
  });
}

module.exports = { initSocket, emitCommentNew, emitPhotoNew, emitPhotoDeleted, roomFor, isPhotoId };
