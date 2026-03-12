import { BotInteractionService } from "../services/bot_interaction.service.js";
import {
  createBotInteractionValidator,
  updateBotInteractionValidator,
} from "../validators/bot_interaction.validator.js";

const service = new BotInteractionService();

export default class BotInteractionController {
  async findAll(req, res) {
    const botInteractions = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: botInteractions,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const botInteraction = await service.findOne(id);

    if (!botInteraction) {
      res.status(404).json({
        message: "Interação não encontrada",
      });
    }

    res.status(200).json({
      message: "Interação encontrada com sucesso!",
      data: botInteraction,
    });
  }

  async create(req, res) {
    const parsed = createBotInteractionValidator.safeParse(req.body);

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
    const parsed = updateBotInteractionValidator.safeParse(req.body);

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
        message: "Interação não encontrada",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Interação não encontrada",
      });
  }
}
