const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Photo owner is required'],
    index: true,
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: 255,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title must be at most 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description must be at most 2000 characters'],
    default: '',
  },
  dateTime: { type: Date, default: Date.now, index: true },
});

photoSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.__v; return ret; },
});

module.exports = mongoose.model('Photo', photoSchema);
