export function enforceApprovedCompanyAccess(req, res, next) {
  if (req.user?.auth_type === "company" && req.user?.approved === false) {
    return res.status(403).json({
      error: "Empresa com aprovação pendente",
      code: "COMPANY_APPROVAL_PENDING",
    });
  }

  next();
}
