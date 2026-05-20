import { ProfessionalService } from "../services/professional.service.js";
import {
  createProfessionalValidator,
  updateProfessionalValidator,
} from "../validators/professional.validator.js";

const service = new ProfessionalService();

export default class ProfessionalController {
  async findAll(req, res) {
    const { id } = req.params
    const professionals = await service.findAll(id);

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: professionals,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const professional = await service.findOne(id);

    if (!professional) {
      res.status(404).json({
        message: "Funcionário não encontrado",
      });
    }

    res.status(200).json({
      message: "Funcionário encontrado com sucesso!",
      data: professional,
    });
  }

  async create(req, res) {
    const parsed = createProfessionalValidator.safeParse(req.body);

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
    const parsed = updateProfessionalValidator.safeParse(req.body);

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
        message: "Funcionário não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Funcionário não encontrado",
      });
  }
}
