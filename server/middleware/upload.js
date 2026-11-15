const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Random server-generated name: ignores the client's filename (no path
  // traversal, no collisions); extension comes from the validated MIME type.
  filename: (_req, file, cb) => {
    cb(null, `photo_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      const err = new Error('Only JPEG, PNG, GIF, or WEBP images are allowed');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

// The MIME type is client-supplied and can be faked, so also check the real
// file signature ("magic bytes") after the file is on disk.
function hasImageSignature(filePath) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try { fs.readSync(fd, buf, 0, 12, 0); } finally { fs.closeSync(fd); }
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = buf.subarray(0, 4).toString('ascii') === 'GIF8';
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
}

function removeUploadedFile(req) {
  if (req.file) fs.unlink(req.file.path, () => {});
}

/** Runs after multer: requires a file and verifies its real content type. */
function requireImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please choose an image file to upload', errors: ['photo is required'] });
  }
  if (!hasImageSignature(req.file.path)) {
    removeUploadedFile(req);
    return res.status(400).json({ success: false, message: 'The file is not a valid image' });
  }
  next();
}

module.exports = { upload, requireImage, removeUploadedFile, UPLOAD_DIR, MAX_FILE_SIZE };
