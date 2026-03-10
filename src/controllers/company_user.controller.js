import { CompanyUserService } from "../services/company_user.service.js";
import {
  createCompanyUserValidator,
  updateCompanyUserValidator,
} from "../validators/company_user.validator.js";

const service = new CompanyUserService();

export default class CompanyUserController {
  async findAll(req, res) {
    const companiesUsers = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: companiesUsers,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const companyUser = await service.findOne(id);

    if (!companyUser) {
      res.status(404).json({
        message: "Funcionário não encontrado",
      });
    }

    res.status(200).json({
      message: "Funcionário encontrado com sucesso!",
      data: companyUser,
    });
  }

  async create(req, res) {
    const parsed = createCompanyUserValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    await service.create(req.body);

    res.status(204).json();
  }

  async update(req, res) {
    const parsed = updateCompanyUserValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    const update = await service.update(Number(req.params.id), parsed.data);

    if (update) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
  }
}
