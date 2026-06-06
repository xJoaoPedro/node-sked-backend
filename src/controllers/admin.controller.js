import { CompanyService } from "../services/company.service.js";

const service = new CompanyService();

export default class AdminController {
  async listPendingCompanies(_req, res) {
    const companies = await service.findPendingApprovals();

    return res.status(200).json({
      message: "Empresas pendentes carregadas com sucesso!",
      data: companies,
    });
  }

  async approveCompany(req, res) {
    const companyId = Number(req.params.id);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const company = await service.approveCompany(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    return res.status(200).json({
      message: "Empresa aprovada com sucesso!",
      data: company,
    });
  }
}
