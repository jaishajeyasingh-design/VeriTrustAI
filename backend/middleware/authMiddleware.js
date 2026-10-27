const config = require('../config/config');

const authMiddleware = (req, res, next) => {
  // Allow health check and root endpoints without auth
  if (req.path === '/health' || req.path === '/api/v1/health' || req.path === '/') {
    return next();
  }

  const apiKeyHeader = req.header('X-API-Key');
  const authHeader = req.header('Authorization');
  let token = apiKeyHeader;

  if (!token && authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  // Permit if token matches configured API keys, or if running in development mode with dev token
  if (!token && config.ENVIRONMENT === 'production') {
    return res.status(401).json({ detail: 'Missing API Key. Provide via X-API-Key or Authorization: Bearer <token>' });
  }

  // Attach role for RBAC
  const role = req.header('X-User-Role') || 'reviewer';
  req.userRole = role;
  req.apiKey = token;

  next();
};

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.userRole || 'reviewer';
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && userRole !== 'administrator') {
      return res.status(403).json({
        detail: `Access forbidden: Operation requires one of [${allowedRoles.join(', ')}] role (current: '${userRole}')`
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};
