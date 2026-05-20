export function getAuthenticatedCompanyId(req) {
  return Number(req.user?.company_id || req.user?.companyId || 0) || null;
}

function isForbidden(res) {
  return res.status(403).json({
    error: "Usuário não tem acesso a esta empresa",
  });
}

export function authorizeCompanyRouteAccess(req, res, next) {
  const authenticatedCompanyId = getAuthenticatedCompanyId(req);
  const routeCompanyId = Number(req.params.id || 0) || null;

  if (!authenticatedCompanyId || !routeCompanyId) {
    return isForbidden(res);
  }

  if (authenticatedCompanyId !== routeCompanyId) {
    return isForbidden(res);
  }

  next();
}

export function authorizeCompanyPayloadAccess(req, res, next) {
  const authenticatedCompanyId = getAuthenticatedCompanyId(req);
  const payloadCompanyId = Number(req.body?.company_id || req.query?.company_id || 0) || null;

  if (!payloadCompanyId) {
    return next();
  }

  if (!authenticatedCompanyId || authenticatedCompanyId !== payloadCompanyId) {
    return isForbidden(res);
  }

  next();
}
