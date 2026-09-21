const env = require('../config/env');

function errorHandler(err, req, res, next) {
  // Always log error server-side
  console.error('💥 Server Error:', err.message || err);
  if (env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Return clean, production-safe response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred. Please try again later.',
    errors: err.errors || null,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: [${req.method}] ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFound
};
