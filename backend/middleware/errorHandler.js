const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);

  const status = err.status || err.statusCode || 500;
  const detail = err.detail || err.message || 'Internal Server Error';

  res.status(status).json({
    detail,
    status
  });
};

module.exports = errorHandler;
