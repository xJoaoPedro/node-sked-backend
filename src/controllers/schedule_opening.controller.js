import { ScheduleOpeningService } from "../services/schedule_opening.service.js";
import {
  createScheduleOpeningValidator,
  updateScheduleOpeningValidator,
} from "../validators/schedule_opening.validator.js";

const service = new ScheduleOpeningService();

export default class ScheduleOpeningController {
  async findAll(req, res) {
    const scheduleOpenings = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: scheduleOpenings,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const scheduleOpening = await service.findOne(id);

    if (!scheduleOpening) {
      res.status(404).json({
        message: "Abertura de agenda não encontrada",
      });
    }

    res.status(200).json({
      message: "Abertura de agenda encontrada com sucesso!",
      data: scheduleOpening,
    });
  }

  async create(req, res) {
    const parsed = createScheduleOpeningValidator.safeParse(req.body);

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
    const parsed = updateScheduleOpeningValidator.safeParse(req.body);

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
        message: "Abertura de agenda não encontrada",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Abertura de agenda não encontrada",
      });
  }
}
