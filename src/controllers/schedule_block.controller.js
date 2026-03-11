import { ScheduleBlockService } from "../services/schedule_block.service.js";
import {
  createScheduleBlockValidator,
  updateScheduleBlockValidator,
} from "../validators/schedule_block.validator.js";

const service = new ScheduleBlockService();

export default class ScheduleBlockController {
  async findAll(req, res) {
    const scheduleBlocks = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: scheduleBlocks,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const scheduleBlock = await service.findOne(id);

    if (!scheduleBlock) {
      res.status(404).json({
        message: "Bloqueio de agenda não encontrado",
      });
    }

    res.status(200).json({
      message: "Bloqueio de agenda encontrado com sucesso!",
      data: scheduleBlock,
    });
  }

  async create(req, res) {
    const parsed = createScheduleBlockValidator.safeParse(req.body);

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
    const parsed = updateScheduleBlockValidator.safeParse(req.body);

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
        message: "Bloqueio de agenda não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Bloqueio de agenda não encontrado",
      });
  }
}
