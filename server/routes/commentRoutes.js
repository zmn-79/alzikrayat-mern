const express = require('express');
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');
const { validateComment } = require('../middleware/validation');

// mergeParams exposes :id from the parent /api/photos/:id/comments mount
const router = express.Router({ mergeParams: true });

router.post('/', requireAuth, validateComment, commentController.create);

module.exports = router;
