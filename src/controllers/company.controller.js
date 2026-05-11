import { CompanyService } from "../services/company.service.js";
import {
  createCompanyValidator,
  updateCompanyValidator,
} from "../validators/company.validator.js";

const service = new CompanyService();
const getRealtimeOptions = (req) => ({
  excludedSocketId: req.headers["x-socket-id"],
});

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

    const update = await service.update(
      Number(req.params.id),
      parsed.data,
      getRealtimeOptions(req),
    );

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

  async getCancellations(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50, filterPeriod = 'month' } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const cancellations = await service.getCancellations(id, page, limit, filterPeriod);

    res.status(200).json({
      message: "Cancelamentos encontrados com sucesso!",
      data: cancellations,
    });
  }

  async getInitialCancellations(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50, filterPeriod = 'month' } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const cancellations = await service.getInitialCancellations(id, page, limit, filterPeriod);

    res.status(200).json({
      message: "Cancelamentos encontrados com sucesso!",
      data: cancellations,
    });
  }

  async getRevenues(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50, filterPeriod = 'month' } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const revenues = await service.getRevenues(id, page, limit, filterPeriod);

    res.status(200).json({
      message: "Receitas encontradas com sucesso!",
      data: revenues,
    });
  }

  async getInitialRevenues(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50, filterPeriod = 'month' } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const revenues = await service.getInitialRevenues(id, page, limit, filterPeriod);

    res.status(200).json({
      message: "Receitas encontradas com sucesso!",
      data: revenues,
    });
  }

  async getServices(req, res) {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const services = await service.getServices(id);

    res.status(200).json({
      message: "Receitas encontradas com sucesso!",
      data: services,
    });
  }

  async getProducts(req, res) {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const services = await service.getProducts(id);

    res.status(200).json({
      message: "Produtos encontrados com sucesso!",
      data: services,
    });
  }

  async getProfessionals(req, res) {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const services = await service.getProfessionals(id);

    res.status(200).json({
      message: "Profissionais encontrados com sucesso!",
      data: services,
    });
  }

  async getCustomers(req, res) {
    const id = Number(req.params.id);
    const { page = 1, limit = 50 } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const customers = await service.getCustomers(id, page, limit);

    res.status(200).json({
      message: "Clientes encontrados com sucesso!",
      data: customers,
    });
  }

  async getInitialCustomers(req, res) {
    const id = Number(req.params.id);
    const { limit = 50 } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const customers = await service.getInitialCustomers(id, limit);

    res.status(200).json({
      message: "Clientes encontrados com sucesso!",
      data: customers,
    });
  }

  async getSettings(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const settings = await service.getSettings(id);

    if (!settings) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    res.status(200).json({
      message: "Configurações encontradas com sucesso!",
      data: settings,
    });
  }
}
