import { ServiceService } from "../services/service.service.js";
import {
  createServiceValidator,
  updateServiceValidator,
} from "../validators/service.validator.js";

const service = new ServiceService();

export default class ServiceController {
  async findAll(req, res) {
    const services = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: services,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const serviceConsult = await service.findOne(id);

    if (!service) {
      res.status(404).json({
        message: "Serviço não encontrado",
      });
    }

    res.status(200).json({
      message: "Serviço encontrado com sucesso!",
      data: serviceConsult,
    });
  }

  async create(req, res) {
    const parsed = createServiceValidator.safeParse(req.body);

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
    const parsed = updateServiceValidator.safeParse(req.body);

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
        message: "Serviço não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Serviço não encontrado",
      });
  }
}
