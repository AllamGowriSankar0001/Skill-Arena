const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account is not active.' });
  }

  return next();
};

module.exports = {
  requireRole,
};
