const express = require('express');
const photoController = require('../controllers/photoController');
const { requireAuth } = require('../middleware/auth');
const { upload, requireImage, removeUploadedFile } = require('../middleware/upload');
const { validate, validateObjectId, photoSchema } = require('../middleware/validation');
const commentRoutes = require('./commentRoutes');

const router = express.Router();

router.get('/', photoController.getAll);
router.get('/:id', validateObjectId('id'), photoController.getOne);

// auth first (no file is written for anonymous callers) -> multer -> real
// image check -> Joi on the text fields -> controller
router.post('/',
  requireAuth,
  upload.single('photo'),
  requireImage,
  validate(photoSchema, removeUploadedFile),
  photoController.create);

router.delete('/:id', requireAuth, validateObjectId('id'), photoController.remove);

// POST /api/photos/:id/comments
router.use('/:id/comments', validateObjectId('id'), commentRoutes);

module.exports = router;
