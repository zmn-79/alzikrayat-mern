const fs = require('fs');
const path = require('path');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const { UPLOAD_DIR } = require('../middleware/upload');
const { emitPhotoNew, emitPhotoDeleted } = require('../socket');

const AUTHOR_FIELDS = 'firstName lastName';

/** Shapes a populated Photo document into the JSON the client consumes. */
const toPhotoDTO = (photo, commentCount) => {
  const obj = photo.toJSON();
  const author = obj.userId && obj.userId._id ? obj.userId : null;
  const dto = {
    _id: obj._id,
    userId: author ? author._id : obj.userId,
    user: author ? { _id: author._id, firstName: author.firstName, lastName: author.lastName } : null,
    fileName: obj.fileName,
    imageUrl: `/uploads/${obj.fileName}`,
    title: obj.title,
    description: obj.description,
    dateTime: obj.dateTime,
  };
  if (commentCount !== undefined) dto.commentCount = commentCount;
  return dto;
};

/** GET /api/photos - newest first, with author and comment count */
exports.getAll = async (_req, res, next) => {
  try {
    const photos = await Photo.find().sort({ dateTime: -1 }).populate('userId', AUTHOR_FIELDS);
    const counts = await Comment.aggregate([
      { $match: { photoId: { $in: photos.map((p) => p._id) } } },
      { $group: { _id: '$photoId', n: { $sum: 1 } } },
    ]);
    const byPhoto = new Map(counts.map((c) => [String(c._id), c.n]));

    res.json({
      success: true,
      count: photos.length,
      photos: photos.map((p) => toPhotoDTO(p, byPhoto.get(String(p._id)) || 0)),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/photos/:id - one photo plus its comments (oldest first) */
exports.getOne = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id).populate('userId', AUTHOR_FIELDS);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    const comments = await Comment.find({ photoId: photo._id })
      .sort({ dateTime: 1 })
      .populate('userId', AUTHOR_FIELDS);

    res.json({
      success: true,
      photo: toPhotoDTO(photo, comments.length),
      comments: comments.map((c) => ({
        _id: c._id,
        photoId: c.photoId,
        comment: c.comment,
        dateTime: c.dateTime,
        user: c.userId ? { _id: c.userId._id, firstName: c.userId.firstName, lastName: c.userId.lastName } : null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/photos (multipart/form-data: photo, title, description) */
exports.create = async (req, res, next) => {
  try {
    const { title, description } = req.body; // already validated by Joi
    const photo = await Photo.create({
      userId: req.userId,
      fileName: req.file.filename,
      title,
      description: description || '',
    });
    await photo.populate('userId', AUTHOR_FIELDS);
    const dto = toPhotoDTO(photo, 0);
    emitPhotoNew(dto); // live notification for every connected client
    res.status(201).json({ success: true, message: 'Photo uploaded', photo: dto });
  } catch (err) {
    // Don't leave an orphaned file on disk if the DB write fails.
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

/** DELETE /api/photos/:id - owner only */
exports.remove = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    // Ownership check uses the id from the verified token, never from the client.
    if (String(photo.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own photos' });
    }

    await Comment.deleteMany({ photoId: photo._id }); // emulate the SQL ON DELETE CASCADE
    await photo.deleteOne();
    // path.basename guards against a tampered fileName escaping the uploads dir
    fs.unlink(path.join(UPLOAD_DIR, path.basename(photo.fileName)), () => {});

    emitPhotoDeleted(photo._id); // open pages can react (remove the card / show a notice)
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
};
