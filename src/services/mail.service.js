import nodemailer from "nodemailer";

export function escapeHtml(value = "") {
  return String(value)
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

export function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";

  if (!host || Number.isNaN(port) || !user || !pass) {
    throw new MailConfigError("Configuracao de email incompleta no servidor.");
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
