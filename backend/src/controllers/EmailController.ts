import { Request, Response } from "express";
import { SendMail } from "../helpers/SendMail";
import AppError from "../errors/AppError";
import logger from "../utils/logger";

const escapeHtml = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

export const sendCrmEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { nome, email, telefone, empresa, segmento, mensagem } = req.body;

    const htmlContent = `
      <h2>Nova Solicitação de CRM Personalizado</h2>
      <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(telefone)}</p>
      <p><strong>Empresa:</strong> ${escapeHtml(empresa)}</p>
      <p><strong>Segmento:</strong> ${escapeHtml(segmento)}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${escapeHtml(mensagem)}</p>
      <hr>
      <p><small>Enviado via formulário do dashboard</small></p>
    `;

    // Usar a função SendMail existente
    const recipient = process.env.CRM_EMAIL_RECIPIENT;
    if (!recipient) throw new AppError("CRM_EMAIL_RECIPIENT não configurado no .env");

    await SendMail({
      to: recipient,
      subject: `Solicitação CRM - ${empresa}`,
      html: htmlContent
    });

    return res.status(200).json({ message: "Email enviado com sucesso!" });
  } catch (error) {
    logger.error("Erro ao enviar email CRM:", error);
    return res.status(500).json({ error: "Erro ao enviar email" });
  }
};
