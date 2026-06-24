/**
 * Centralized error handler — used by all routes.
 */

export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  const message = err.expose === false ? 'internal error' : err.message;
  res.status(status).json({
    error: { code: err.code || (status === 400 ? 'BAD_REQUEST' : 'INTERNAL'), message }
  });
}
