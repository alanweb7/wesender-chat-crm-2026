import OpenAI from "openai";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface Params {
  contactId: number;
  companyId: number;
  apiKey: string;
  provider: string;
  currentMemory: string | null;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}

const UpdateContactAiMemoryService = async (params: Params): Promise<void> => {
  const { contactId, companyId, apiKey, currentMemory, recentMessages } = params;

  if (!apiKey || recentMessages.length === 0) return;

  try {
    const client = new OpenAI({ apiKey });

    const systemPrompt = `Você é um sistema de memória de IA. Sua função é manter um resumo conciso e útil sobre um contato com base nas conversas.

Regras:
- Máximo 800 caracteres no total
- Use bullet points curtos (•)
- Inclua: preferências, assuntos discutidos, problemas, decisões tomadas, informações pessoais relevantes
- Mantenha apenas o que é útil para futuras conversas
- Remova informações desatualizadas ou irrelevantes
- Escreva em português

Memória atual:
${currentMemory || "(sem memória ainda)"}

Novas mensagens da conversa:
${recentMessages.map(m => `[${m.role === "user" ? "Cliente" : "IA"}]: ${m.content}`).join("\n")}

Retorne APENAS o resumo atualizado, sem explicações.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    const updatedMemory = response.choices[0]?.message?.content?.trim();
    if (!updatedMemory) return;

    await Contact.update(
      { aiMemory: updatedMemory },
      { where: { id: contactId, companyId } }
    );

    logger.info(`[AI][Memory] Memória atualizada para contactId=${contactId}`);
  } catch (err) {
    logger.error(`[AI][Memory] Falha ao atualizar memória do contactId=${contactId}:`, err);
  }
};

export default UpdateContactAiMemoryService;
