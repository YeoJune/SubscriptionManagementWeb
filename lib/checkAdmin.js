// lib/checkAdmin.js
const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.id === process.env.ADMIN_ID) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

module.exports = checkAdmin;
