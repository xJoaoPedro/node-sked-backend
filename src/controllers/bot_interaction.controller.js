import { BotInteractionService } from "../services/bot_interaction.service.js";
import { EvolutionAutoReplyService } from "../services/evolution-auto-reply.service.js";
import { EvolutionService } from "../services/evolution.service.js";
import {
  createBotInteractionValidator,
  updateBotInteractionValidator,
} from "../validators/bot_interaction.validator.js";
import {
  connectEvolutionInstanceValidator,
  createEvolutionInstanceValidator,
  evolutionConnectionStateValidator,
  sendEvolutionTextValidator,
} from "../validators/evolution.validator.js";

const service = new BotInteractionService();
const evolutionService = new EvolutionService();
const evolutionAutoReplyService = new EvolutionAutoReplyService();

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

  async createEvolutionInstance(req, res) {
    const parsed = createEvolutionInstanceValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const data = await evolutionService.createInstance(parsed.data);

    return res.status(201).json({
      message: "Instancia criada na Evolution com sucesso!",
      data,
    });
  }

  async connectEvolutionInstance(req, res) {
    const parsed = connectEvolutionInstanceValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const data = await evolutionService.connectInstance(parsed.data.instanceName);

    return res.status(200).json({
      message: "Solicitacao de conexao enviada para a Evolution!",
      data,
    });
  }

  async evolutionConnectionState(req, res) {
    const parsed = evolutionConnectionStateValidator.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const data = await evolutionService.getConnectionState(parsed.data.instanceName);

    return res.status(200).json({
      message: "Status da instancia consultado com sucesso!",
      data,
    });
  }

  async sendEvolutionText(req, res) {
    const parsed = sendEvolutionTextValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const data = await evolutionService.sendText(parsed.data);

    return res.status(200).json({
      message: "Mensagem enviada pela Evolution com sucesso!",
      data,
    });
  }

  async handleEvolutionWebhook(req, res) {
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    const receivedSecret = req.get("x-webhook-secret");

    if (expectedSecret && receivedSecret !== expectedSecret) {
      return res.status(401).json({
        message: "Webhook nao autorizado",
      });
    }

    const normalizedBody = {
      ...req.body,
      event: req.body?.event || String(req.params?.event || "").replace(/-/g, "."),
    };

    evolutionAutoReplyService.handleWebhook(normalizedBody).catch((error) => {
      console.error("Evolution webhook automation error:", error);
    });

    return res.status(204).json();
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
