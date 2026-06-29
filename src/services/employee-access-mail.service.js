import { createMailTransporter, escapeHtml } from "./mail.service.js";

export class EmployeeAccessMailService {
  async sendWelcomeAccess({ employeeName, employeeEmail, temporaryPassword, companyName }) {
    const transporter = createMailTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const escapedEmployeeName = escapeHtml(employeeName || "Profissional");
    const escapedCompanyName = escapeHtml(companyName || "sua empresa");
    const escapedTemporaryPassword = escapeHtml(temporaryPassword);

    await transporter.sendMail({
      from,
      to: employeeEmail,
      subject: "Seu acesso ao Sked foi criado",
      text: [
        `Ola, ${employeeName || "profissional"}!`,
        "",
        `Seu acesso ao Sked para ${companyName || "sua empresa"} foi criado.`,
        `Email: ${employeeEmail}`,
        `Senha temporaria: ${temporaryPassword}`,
        "",
        "Recomendamos alterar essa senha no primeiro acesso.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Seu acesso ao Sked foi criado</h2>
          <p>Ola, <strong>${escapedEmployeeName}</strong>!</p>
          <p>Seu acesso ao Sked para <strong>${escapedCompanyName}</strong> foi criado.</p>
          <p><strong>Email:</strong> ${escapeHtml(employeeEmail)}</p>
          <p><strong>Senha temporaria:</strong> ${escapedTemporaryPassword}</p>
          <p>Recomendamos alterar essa senha no primeiro acesso.</p>
        </div>
      `,
    });
  }
}
