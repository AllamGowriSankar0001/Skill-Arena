const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const exposeMessage = Boolean(err.expose) || (statusCode >= 400 && statusCode < 500);

  // Log safely — never include Authorization, cookies, or bodies that may hold secrets.
  console.error('[api-error]', {
    statusCode,
    code: err.code || undefined,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ message: messages.join('. ') || 'Validation failed.' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with that unique value already exists.' });
  }

  if (statusCode >= 500) {
    return res.status(statusCode).json({
      message:
        isProduction || !exposeMessage
          ? 'An unexpected server error occurred.'
          : err.message || 'Server error',
      ...(err.code ? { code: err.code } : {}),
    });
  }

  return res.status(statusCode).json({
    message: err.message || 'Request failed',
    ...(err.code ? { code: err.code } : {}),
    ...(err.previousLessonId ? { previousLessonId: err.previousLessonId } : {}),
  });
};

module.exports = errorMiddleware;
