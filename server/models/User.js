const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name must be at most 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name must be at most 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [100, 'Email must be at most 100 characters'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },
  // bcrypt hash only - the plain-text password is never stored.
  // select:false keeps the hash out of every query unless explicitly requested.
  password: {
    type: String,
    required: [true, 'Password hash is required'],
    select: false,
  },
  // Optional profile fields (carried over from the PHP version)
  location: { type: String, trim: true, maxlength: 100 },
  occupation: { type: String, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000 },
});

// Defence in depth: never serialise the hash, even if it was selected.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
