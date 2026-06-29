import { contactValidator } from "../validators/contact.validator.js";
import { ContactService } from "../services/contact.service.js";
import { MailConfigError } from "../services/mail.service.js";

const contactService = new ContactService();

export default class ContactController {
  async send(req, res) {
    const parsed = contactValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: parsed.error.format(),
      });
    }

    try {
      await contactService.sendContactMessage(parsed.data);

      return res.status(204).json();
    } catch (error) {
      if (error instanceof MailConfigError) {
        return res.status(503).json({
          message: error.message,
        });
      }

      console.error("Erro ao enviar email de contato:", error);

      return res.status(500).json({
        message: "Não foi possível enviar a mensagem no momento.",
      });
    }
  }
}
