import { ProfessionalService } from "../services/professional.service.js";
import { EmailConflictError } from "../services/email-identity.service.js";
import { MailConfigError } from "../services/mail.service.js";
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

    try {
      await service.create(req.body);
    } catch (error) {
      if (error instanceof EmailConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      if (error instanceof MailConfigError) {
        return res.status(500).json({
          message: error.message,
        });
      }

      throw error;
    }

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

    let update;

    try {
      update = await service.update(Number(req.params.id), parsed.data);
    } catch (error) {
      if (error instanceof EmailConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      throw error;
    }

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
