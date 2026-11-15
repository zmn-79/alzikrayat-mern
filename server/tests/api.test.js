// End-to-end API tests: real Express app, real MongoDB (separate test database).
// Run with: npm test   (requires a running MongoDB)
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/alzikrayat_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../config/db');
const User = require('../models/User');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');

const UPLOADS = path.join(__dirname, '..', 'uploads');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const files = () => fs.readdirSync(UPLOADS).filter((f) => f !== '.gitkeep');

let server, base;
const state = {};

const api = async (method, url, { token, json, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(base + url, { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const photoForm = ({ title = 'Sunset', description = 'Nice', bytes = PNG, type = 'image/png', name = 'a.png' } = {}) => {
  const f = new FormData();
  if (title !== null) f.append('title', title);
  f.append('description', description);
  if (bytes) f.append('photo', new Blob([bytes], { type }), name);
  return f;
};

before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Photo.init(), Comment.init()]); // build unique index
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  state.filesBefore = files().length;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

const alice = { firstName: 'Alice', lastName: 'Ali', email: 'Alice@Example.com', password: 'Secret123', location: 'Khartoum' };
const bob = { firstName: 'Bob', lastName: 'Bakr', email: 'bob@example.com', password: 'Passw0rdBob' };

test('register: creates user, hashes password with bcrypt, never returns it', async () => {
  const r = await api('POST', '/api/auth/register', { json: alice });
  assert.equal(r.status, 201);
  assert.equal(r.body.success, true);
  assert.ok(r.body.token);
  assert.equal(r.body.user.email, 'alice@example.com'); // lower-cased
  assert.equal(r.body.user.password, undefined);
  const stored = await User.findOne({ email: 'alice@example.com' }).select('+password');
  assert.notEqual(stored.password, alice.password);
  assert.match(stored.password, /^\$2[aby]\$10\$/);
  state.alice = r.body;
  state.bob = (await api('POST', '/api/auth/register', { json: bob })).body;
});

test('register: duplicate email -> 409', async () => {
  const r = await api('POST', '/api/auth/register', { json: alice });
  assert.equal(r.status, 409);
});

test('register: invalid input -> 400 with messages', async () => {
  const r = await api('POST', '/api/auth/register', { json: { firstName: '', email: 'nope', password: 'short' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.success, false);
  assert.ok(r.body.errors.length >= 3);
});

test('register: malformed JSON -> 400', async () => {
  const res = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});

test('login: success, wrong password and unknown email', async () => {
  const ok = await api('POST', '/api/auth/login', { json: { email: 'alice@example.com', password: alice.password } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  const bad = await api('POST', '/api/auth/login', { json: { email: 'alice@example.com', password: 'WrongPass1' } });
  assert.equal(bad.status, 401);
  const unknown = await api('POST', '/api/auth/login', { json: { email: 'ghost@example.com', password: 'Whatever1' } });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.message, bad.body.message); // no user enumeration
  const missing = await api('POST', '/api/auth/login', { json: {} });
  assert.equal(missing.status, 400);
});

test('photos: empty list at start', async () => {
  const r = await api('GET', '/api/photos');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.photos, []);
});

test('upload: requires authentication and writes nothing', async () => {
  const r = await api('POST', '/api/photos', { form: photoForm() });
  assert.equal(r.status, 401);
  assert.equal(files().length, state.filesBefore);
});

test('upload: valid image -> 201, file on disk, metadata in MongoDB', async () => {
  const r = await api('POST', '/api/photos', { token: state.alice.token, form: photoForm({ title: 'Sunset', description: 'Over the Nile' }) });
  assert.equal(r.status, 201);
  assert.equal(r.body.success, true);
  assert.equal(r.body.photo.title, 'Sunset');
  assert.equal(r.body.photo.user.firstName, 'Alice');
  assert.ok(fs.existsSync(path.join(UPLOADS, r.body.photo.fileName)));
  assert.ok(await Photo.findById(r.body.photo._id));
  assert.equal(String((await Photo.findById(r.body.photo._id)).userId), state.alice.user._id);
  state.photo = r.body.photo;
  const img = await fetch(base + r.body.photo.imageUrl);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
});

test('upload: rejects non-image MIME, spoofed content, oversize, missing file, missing title', async () => {
  const before = files().length;
  const t = state.alice.token;
  const txt = await api('POST', '/api/photos', { token: t, form: photoForm({ bytes: Buffer.from('hello'), type: 'text/plain', name: 'a.txt' }) });
  assert.equal(txt.status, 400);
  const spoof = await api('POST', '/api/photos', { token: t, form: photoForm({ bytes: Buffer.from('<?php evil ?>'), type: 'image/png', name: 'a.png' }) });
  assert.equal(spoof.status, 400);
  assert.equal(spoof.body.message, 'The file is not a valid image');
  const big = await api('POST', '/api/photos', { token: t, form: photoForm({ bytes: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]) }) });
  assert.equal(big.status, 413);
  const nofile = await api('POST', '/api/photos', { token: t, form: photoForm({ bytes: null }) });
  assert.equal(nofile.status, 400);
  const notitle = await api('POST', '/api/photos', { token: t, form: photoForm({ title: '' }) });
  assert.equal(notitle.status, 400);
  assert.equal(files().length, before, 'rejected uploads must not leave files behind');
  assert.equal(await Photo.countDocuments(), 1);
});

test('GET /api/photos and /api/photos/:id', async () => {
  const list = await api('GET', '/api/photos');
  assert.equal(list.body.count, 1);
  assert.equal(list.body.photos[0].commentCount, 0);
  const one = await api('GET', `/api/photos/${state.photo._id}`);
  assert.equal(one.status, 200);
  assert.equal(one.body.photo.title, 'Sunset');
  assert.deepEqual(one.body.comments, []);
});

test('GET /api/photos/:id: invalid id -> 400, unknown id -> 404', async () => {
  assert.equal((await api('GET', '/api/photos/not-an-id')).status, 400);
  assert.equal((await api('GET', '/api/photos/' + new mongoose.Types.ObjectId())).status, 404);
});

test('comments: auth, validation, 404, success, persisted with author', async () => {
  const url = `/api/photos/${state.photo._id}/comments`;
  assert.equal((await api('POST', url, { json: { comment: 'hi' } })).status, 401);
  assert.equal((await api('POST', url, { token: state.bob.token, json: { comment: '   ' } })).status, 400);
  assert.equal((await api('POST', url, { token: state.bob.token, json: { comment: 'x'.repeat(1001) } })).status, 400);
  assert.equal((await api('POST', `/api/photos/${new mongoose.Types.ObjectId()}/comments`, { token: state.bob.token, json: { comment: 'hi' } })).status, 404);
  assert.equal((await api('POST', '/api/photos/bad-id/comments', { token: state.bob.token, json: { comment: 'hi' } })).status, 400);

  const ok = await api('POST', url, { token: state.bob.token, json: { comment: '  Beautiful!  ' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.comment.comment, 'Beautiful!');
  assert.equal(ok.body.comment.user.firstName, 'Bob');
  const doc = await Comment.findById(ok.body.comment._id);
  assert.equal(String(doc.photoId), state.photo._id);
  assert.equal(String(doc.userId), state.bob.user._id);

  const one = await api('GET', `/api/photos/${state.photo._id}`);
  assert.equal(one.body.comments.length, 1);
  assert.equal(one.body.comments[0].user.lastName, 'Bakr');
  assert.equal((await api('GET', '/api/photos')).body.photos[0].commentCount, 1);
});

test('delete: unauthenticated 401, non-owner 403 (photo untouched), invalid id 400, unknown 404', async () => {
  const url = `/api/photos/${state.photo._id}`;
  assert.equal((await api('DELETE', url)).status, 401);
  const forbidden = await api('DELETE', url, { token: state.bob.token });
  assert.equal(forbidden.status, 403);
  assert.ok(await Photo.findById(state.photo._id));
  assert.ok(fs.existsSync(path.join(UPLOADS, state.photo.fileName)));
  assert.equal((await api('DELETE', '/api/photos/xyz', { token: state.alice.token })).status, 400);
  assert.equal((await api('DELETE', '/api/photos/' + new mongoose.Types.ObjectId(), { token: state.alice.token })).status, 404);
});

test('delete: owner succeeds, removes DB record, comments and file', async () => {
  const r = await api('DELETE', `/api/photos/${state.photo._id}`, { token: state.alice.token });
  assert.equal(r.status, 200);
  assert.equal(await Photo.findById(state.photo._id), null);
  assert.equal(await Comment.countDocuments({ photoId: state.photo._id }), 0);
  await new Promise((res) => setTimeout(res, 100));
  assert.ok(!fs.existsSync(path.join(UPLOADS, state.photo.fileName)));
  assert.equal((await api('GET', `/api/photos/${state.photo._id}`)).status, 404);
  assert.equal(files().length, state.filesBefore);
});

test('auth: tampered / garbage tokens are rejected', async () => {
  const r = await api('POST', '/api/photos', { token: 'garbage.token.here', form: photoForm() });
  assert.equal(r.status, 401);
});
