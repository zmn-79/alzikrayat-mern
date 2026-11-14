const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
// Compared against when the email is unknown, so login takes about the same
// time whether or not the account exists (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', SALT_ROUNDS);

const signToken = (user) =>
  jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  location: user.location,
  occupation: user.occupation,
  description: user.description,
});

/** POST /api/auth/register */
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, location, occupation, description } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      firstName, lastName, email, password: hash,
      location: location || undefined,
      occupation: occupation || undefined,
      description: description || undefined,
    });

    res.status(201).json({ success: true, message: 'Account created', token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err); // duplicate-key race (code 11000) is mapped to 409 by errorHandler
  }
};

/** POST /api/auth/login */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, message: 'Logged in', token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};
