import nodemailer from "nodemailer";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export class MailConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "MailConfigError";
  }
}

export class ContactService {
  createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";

    if (!host || Number.isNaN(port) || !user || !pass) {
      throw new MailConfigError("Configuração de email incompleta no servidor.");
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendContactMessage(contact) {
    const transporter = this.createTransporter();
    const to = process.env.CONTACT_TO_EMAIL || "xjoaopedro.dev@gmail.com";
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const name = contact.name || "Não informado";
    const email = contact.email || "Não informado";
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedMessage = escapeHtml(contact.message).replace(/\n/g, "<br />");

    await transporter.sendMail({
      from,
      to,
      replyTo: contact.email || undefined,
      subject: `Novo contato pelo site`,
      text: [
        "Nova mensagem enviada pela landing page do Sked.",
        "Mensagem:",
        contact.message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Nova mensagem enviada pela landing page do Sked</h2>
          <p><strong>Mensagem:</strong></p>
          <p>${escapedMessage}</p>
        </div>
      `,
    });
  }
}
