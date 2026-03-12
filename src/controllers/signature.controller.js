import { SignatureService } from "../services/signature.service.js";
import {
  createSignatureValidator,
  updateSignatureValidator,
} from "../validators/signature.validator.js";

const service = new SignatureService();

export default class SignatureController {
  async findAll(req, res) {
    const signatures = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: signatures,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const signature = await service.findOne(id);

    if (!signature) {
      res.status(404).json({
        message: "Assinatura não encontrada",
      });
    }

    res.status(200).json({
      message: "Assinatura encontrada com sucesso!",
      data: signature,
    });
  }

  async create(req, res) {
    const parsed = createSignatureValidator.safeParse(req.body);

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
    const parsed = updateSignatureValidator.safeParse(req.body);

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
        message: "Assinatura não encontrada",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Assinatura não encontrada",
      });
  }
}
