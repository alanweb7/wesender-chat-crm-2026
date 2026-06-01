import { Request, Response } from "express";
import HostiNotasConfig from "../models/HostiNotasConfig";

export const getConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    const config = await HostiNotasConfig.findOne();
    
    if (!config) {
      return res.status(404).json({ message: "Configuração não encontrada" });
    }

    return res.json(config);
  } catch (error) {
    console.error("Erro ao buscar configuração Hosti Notas:", error);
    return res.status(500).json({ message: "Erro ao buscar configuração" });
  }
};

export const saveConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { apiKey, isActive } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ message: "API Key é obrigatória" });
    }

    // Verificar se já existe uma configuração
    let config = await HostiNotasConfig.findOne();

    if (config) {
      // Atualizar configuração existente
      await config.update({
        apiKey: apiKey.trim(),
        isActive: isActive !== undefined ? isActive : true,
      });
    } else {
      // Criar nova configuração
      config = await HostiNotasConfig.create({
        apiKey: apiKey.trim(),
        isActive: isActive !== undefined ? isActive : true,
      });
    }

    return res.json(config);
  } catch (error) {
    console.error("Erro ao salvar configuração Hosti Notas:", error);
    return res.status(500).json({ message: "Erro ao salvar configuração" });
  }
};
