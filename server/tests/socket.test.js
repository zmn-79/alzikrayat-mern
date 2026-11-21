// Real-time tests (Project 4, Track D): real Express + Socket.io on one http
// server, real MongoDB (separate test database) and real socket.io-client sockets.
// Run with: npm test   (requires a running MongoDB; files run one after another)
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/alzikrayat_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const { io: connectClient } = require('socket.io-client');
const app = require('../server');
const connectDB = require('../config/db');
const { initSocket } = require('../socket');
const User = require('../models/User');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let httpServer, ioServer, base;
const clients = [];   // every socket we open, closed in after()
const users = {};     // { alice, bob } -> { token, user }
const photos = {};    // { p1, p2 }    -> photo JSON from the REST API

// ---- helpers ----------------------------------------------------------------
const rest = async (method, url, { token, json, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(base + url, { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const photoForm = (title) => {
  const f = new FormData();
  f.append('title', title);
  f.append('photo', new Blob([PNG], { type: 'image/png' }), 'a.png');
  return f;
};

const postComment = (photoId, token, comment = 'Hello from the test') =>
  rest('POST', `/api/photos/${photoId}/comments`, { token, json: { comment } });

/** Opens a socket and resolves once it is connected. */
const connect = () => new Promise((resolve, reject) => {
  const c = connectClient(base, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(c);
  c.once('connect', () => resolve(c));
  c.once('connect_error', reject);
});

/** photo:join / photo:leave with the acknowledgement as the return value. */
const ask = (client, event, payload) => new Promise((resolve) => client.emit(event, payload, resolve));

/** Resolves with the first payload of `event`, rejects after `ms`. */
const nextEvent = (client, event, ms = 2000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
  client.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
});

/** Resolves true when NO `event` arrives within `ms` (used for negative assertions). */
const staysSilent = (client, event, ms = 400) => new Promise((resolve) => {
  const onEvent = () => resolve(false);
  client.once(event, onEvent);
  setTimeout(() => { client.off(event, onEvent); resolve(true); }, ms);
});

// ---- setup / teardown ---------------------------------------------------------
before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Photo.init(), Comment.init()]);

  // Same http server for Express and Socket.io, exactly like server.js does.
  httpServer = http.createServer(app);
  ioServer = initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  base = `http://127.0.0.1:${httpServer.address().port}`;

  users.alice = (await rest('POST', '/api/auth/register', {
    json: { firstName: 'Alice', lastName: 'Ali', email: 'alice@example.com', password: 'Secret123' },
  })).body;
  users.bob = (await rest('POST', '/api/auth/register', {
    json: { firstName: 'Bob', lastName: 'Bakr', email: 'bob@example.com', password: 'Passw0rdBob' },
  })).body;
  photos.p1 = (await rest('POST', '/api/photos', { token: users.alice.token, form: photoForm('Photo one') })).body.photo;
  photos.p2 = (await rest('POST', '/api/photos', { token: users.alice.token, form: photoForm('Photo two') })).body.photo;
});

after(async () => {
  clients.forEach((c) => c.close());
  // Removes the uploaded test files from disk through the normal REST path.
  for (const p of Object.values(photos)) {
    await rest('DELETE', `/api/photos/${p._id}`, { token: users.alice.token });
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => ioServer.close(resolve)); // also closes the http server
});

// ---- tests --------------------------------------------------------------------
test('comment:new reaches two clients in the same room and matches the REST payload', async () => {
  const [a, b] = await Promise.all([connect(), connect()]);
  assert.deepEqual(await ask(a, 'photo:join', photos.p1._id), { ok: true, room: `photo:${photos.p1._id}` });
  assert.equal((await ask(b, 'photo:join', photos.p1._id)).ok, true);

  const gotA = nextEvent(a, 'comment:new');
  const gotB = nextEvent(b, 'comment:new');
  const res = await postComment(photos.p1._id, users.bob.token, 'Nice shot!');
  assert.equal(res.status, 201);

  const [fromA, fromB] = await Promise.all([gotA, gotB]);
  assert.deepEqual(fromA, res.body.comment);       // identical JSON to the REST response
  assert.deepEqual(fromB, res.body.comment);
  assert.equal(fromA.comment, 'Nice shot!');
  assert.equal(fromA.user.firstName, 'Bob');       // populated author name is included
  assert.equal(fromA.photoId, photos.p1._id);
});

test('a client in another room (or in no room) does NOT receive the comment', async () => {
  const [inRoom, otherRoom, noRoom] = await Promise.all([connect(), connect(), connect()]);
  await ask(inRoom, 'photo:join', photos.p1._id);
  await ask(otherRoom, 'photo:join', photos.p2._id);

  const quietOther = staysSilent(otherRoom, 'comment:new');
  const quietNone = staysSilent(noRoom, 'comment:new');
  const gotIt = nextEvent(inRoom, 'comment:new');
  await postComment(photos.p1._id, users.alice.token, 'Only for photo one');

  await gotIt;
  assert.equal(await quietOther, true);
  assert.equal(await quietNone, true);
});

test('photo:join rejects invalid ids and the socket receives nothing afterwards', async () => {
  const c = await connect();
  const bad = [undefined, null, 42, {}, [], 'abc', 'x'.repeat(24), '../../etc/passwd', `${photos.p1._id}0`];
  for (const value of bad) {
    const ack = await ask(c, 'photo:join', value);
    assert.equal(ack.ok, false, `should reject ${JSON.stringify(value)}`);
  }
  // join with no acknowledgement callback must not crash the server either
  c.emit('photo:join', 'not-an-id');

  const quiet = staysSilent(c, 'comment:new');
  await postComment(photos.p1._id, users.bob.token);
  assert.equal(await quiet, true);
  assert.equal(c.connected, true);
});

test('room names are case-insensitive: an upper-case id joins the same room', async () => {
  const c = await connect();
  assert.equal((await ask(c, 'photo:join', photos.p1._id.toUpperCase())).ok, true);
  const got = nextEvent(c, 'comment:new');
  await postComment(photos.p1._id, users.bob.token, 'case test');
  assert.equal((await got).comment, 'case test');
});

test('after photo:leave the client stops receiving comments', async () => {
  const stays = await connect();
  const leaves = await connect();
  await ask(stays, 'photo:join', photos.p1._id);
  await ask(leaves, 'photo:join', photos.p1._id);
  assert.equal((await ask(leaves, 'photo:leave', photos.p1._id)).ok, true);

  const quiet = staysSilent(leaves, 'comment:new');
  const got = nextEvent(stays, 'comment:new');
  await postComment(photos.p1._id, users.bob.token, 'after leave');
  await got;
  assert.equal(await quiet, true);
});

test('a socket cannot join more than 10 photo rooms', async () => {
  const c = await connect();
  const ids = Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(24, 'a'));
  const acks = [];
  for (const id of ids) acks.push(await ask(c, 'photo:join', id));
  assert.equal(acks.slice(0, 10).every((a) => a.ok), true);
  assert.equal(acks[10].ok, false);
});

test('REST is the only write path: comment events sent by a client are ignored', async () => {
  const sender = await connect();
  const viewer = await connect();
  await ask(viewer, 'photo:join', photos.p1._id);
  const before = await Comment.countDocuments();

  const quiet = staysSilent(viewer, 'comment:new');
  sender.emit('comment:new', { photoId: photos.p1._id, comment: 'forged over the socket' });
  sender.emit('comment:create', { photoId: photos.p1._id, comment: 'forged over the socket' });
  assert.equal(await quiet, true);
  assert.equal(await Comment.countDocuments(), before);
});

test('failed REST writes (401, 400, 404) emit nothing', async () => {
  const c = await connect();
  await ask(c, 'photo:join', photos.p1._id);
  const quiet = staysSilent(c, 'comment:new');

  assert.equal((await postComment(photos.p1._id, undefined)).status, 401);           // not logged in
  assert.equal((await postComment(photos.p1._id, users.bob.token, '   ')).status, 400); // empty after trim
  assert.equal((await postComment('b'.repeat(24), users.bob.token)).status, 404);    // unknown photo
  assert.equal(await quiet, true);
});

test('photo:new is broadcast to every client and matches the REST payload', async () => {
  const [inRoom, anywhere] = await Promise.all([connect(), connect()]);
  await ask(inRoom, 'photo:join', photos.p1._id);

  const gotRoom = nextEvent(inRoom, 'photo:new');
  const gotAny = nextEvent(anywhere, 'photo:new');
  const res = await rest('POST', '/api/photos', { token: users.bob.token, form: photoForm('Live upload') });
  assert.equal(res.status, 201);
  photos.live = res.body.photo; // deleted in the next test

  assert.deepEqual(await gotRoom, res.body.photo);
  assert.deepEqual(await gotAny, res.body.photo);
  assert.equal((await gotAny).user.firstName, 'Bob');
});

test('photo:deleted is broadcast, and the deleted photo room is emptied', async () => {
  const [viewer, other] = await Promise.all([connect(), connect()]);
  await ask(viewer, 'photo:join', photos.live._id);

  const gotViewer = nextEvent(viewer, 'photo:deleted');
  const gotOther = nextEvent(other, 'photo:deleted');
  const res = await rest('DELETE', `/api/photos/${photos.live._id}`, { token: users.bob.token });
  assert.equal(res.status, 200);

  assert.deepEqual(await gotViewer, { photoId: photos.live._id });
  assert.deepEqual(await gotOther, { photoId: photos.live._id });
  const members = await ioServer.in(`photo:${photos.live._id}`).fetchSockets();
  assert.equal(members.length, 0);
  delete photos.live;
});

test('a forbidden delete (403) emits no photo:deleted', async () => {
  const c = await connect();
  const quiet = staysSilent(c, 'photo:deleted');
  const res = await rest('DELETE', `/api/photos/${photos.p2._id}`, { token: users.bob.token }); // Bob is not the owner
  assert.equal(res.status, 403);
  assert.equal(await quiet, true);
});
