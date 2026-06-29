import { UserService } from "../services/user.service.js";
import { EmailConflictError } from "../services/email-identity.service.js";
import {
  createUserValidator,
  updateUserValidator,
} from "../validators/user.validator.js";

const service = new UserService();

export default class UserController {
  async findAll(req, res) {
    const users = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: users,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const user = await service.findOne(id);

    if (!user) {
      res.status(404).json({
        message: "Usuário não encontrado",
      });
    }

    res.status(200).json({
      message: "Usuário encontrado com sucesso!",
      data: user,
    });
  }

  async create(req, res) {
    const parsed = createUserValidator.safeParse(req.body);

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

      throw error;
    }

    res.status(204).json();
  }

  async update(req, res) {
    const parsed = updateUserValidator.safeParse(req.body);

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
        message: "Usuário não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Usuário não encontrado",
      });
  }
}
