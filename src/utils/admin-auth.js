export function adminAuth(req, res, next) {
  const configuredPassword = process.env.ADMIN_PANEL_PASSWORD;

  if (!configuredPassword) {
    return res.status(500).json({
      error: "Senha do painel admin não configurada",
    });
  }

  const providedPassword = req.headers["x-admin-password"];

  if (!providedPassword || providedPassword !== configuredPassword) {
    return res.status(401).json({
      error: "Senha do painel admin inválida",
    });
  }

  next();
}
