import { createMailTransporter, escapeHtml } from "./mail.service.js";

export class ContactService {
  async sendContactMessage(contact) {
    const transporter = createMailTransporter();
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
