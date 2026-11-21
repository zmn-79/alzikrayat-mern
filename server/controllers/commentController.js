const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const { emitCommentNew } = require('../socket');

/** POST /api/photos/:id/comments */
exports.create = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id).select('_id');
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    const created = await Comment.create({
      photoId: photo._id,
      userId: req.userId,
      comment: req.body.comment,
    });
    await created.populate('userId', 'firstName lastName');

    const comment = {
      _id: created._id,
      photoId: created.photoId,
      comment: created.comment,
      dateTime: created.dateTime,
      user: { _id: created.userId._id, firstName: created.userId.firstName, lastName: created.userId.lastName },
    };

    // Saved successfully -> tell everyone viewing this photo (same JSON as the response below).
    emitCommentNew(comment);

    res.status(201).json({ success: true, message: 'Comment added', comment });
  } catch (err) {
    next(err);
  }
};
