function isForbidden(res) {
  return res.status(403).json({
    error: "Usuário não tem acesso a este perfil",
  });
}

export function authorizeUserSelfAccess(req, res, next) {
  const authenticatedUserId = Number(req.user?.user_id || req.user?.userId || 0) || null;
  const routeUserId = Number(req.params.id || 0) || null;

  if (!authenticatedUserId || !routeUserId) {
    return isForbidden(res);
  }

  if (authenticatedUserId !== routeUserId) {
    return isForbidden(res);
  }

  next();
}
