import { CompanyService } from "../services/company.service.js";
import {
  createCompanyValidator,
  updateCompanyValidator,
} from "../validators/company.validator.js";

const service = new CompanyService();

export default class CompanyController {
  async findAll(req, res) {
    const companies = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: companies,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const company = await service.findOne(id);

    if (!company) {
      res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    res.status(200).json({
      message: "Empresa encontrada com sucesso!",
      data: company,
    });
  }

  async update(req, res) {
    const parsed = updateCompanyValidator.safeParse(req.body);

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

  async getAllData(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const data = await service.getAllData(id);

    res.status(200).json({
      message: "Empresa encontrada com sucesso!",
      data: data,
    });
  }

  async getAppointments(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50, ...filters } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const appointments = await service.getAppointments(id, page, limit, filters);

    res.status(200).json({
      message: "Agendamentos encontrados com sucesso!",
      data: appointments,
    });
  }
}