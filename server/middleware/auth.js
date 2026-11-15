const jwt = require('jsonwebtoken');

/**
 * requireAuth - verifies "Authorization: Bearer <token>" and exposes the
 * caller's id as req.userId. Ownership checks always use this server-side
 * value, never an id sent by the client.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err); // handled as 401 by errorHandler
  }
}

module.exports = { requireAuth };
