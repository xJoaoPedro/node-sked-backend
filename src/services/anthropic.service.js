function trimResponse(text = "") {
  return text.replace(/\s+\n/g, "\n").trim();
}

function extractFirstJsonObject(text = "") {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  return text.slice(start, end + 1);
}

function safeParseJson(text = "") {
  const jsonCandidate = extractFirstJsonObject(text);

  if (!jsonCandidate) return null;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

export class AnthropicService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    this.baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  async interpretAppointmentMessage({
    companyContext,
    customerName,
    customerMessage,
    services = [],
    professionals = [],
    previousState = null,
  }) {
    if (!this.isConfigured || !customerMessage?.trim()) {
      return null;
    }

    const servicesSummary = services
      .slice(0, 6)
      .map((service) => {
        const duration = service.duration_minutes ? ` | ${service.duration_minutes} min` : ""
        return `- ${service.name}${duration}`
      })
      .join("\n");
    const professionalsSummary = professionals
      .slice(0, 6)
      .map((professional) => `- ${professional.name}${professional.role ? ` | ${professional.role}` : ""}`)
      .join("\n");
    const compactPreviousState = previousState
      ? {
          phase: previousState.phase || null,
          serviceId: previousState.serviceId || null,
          employeeId: previousState.employeeId || null,
          dateString: previousState.dateString || null,
          timeString: previousState.timeString || null,
          periodKey: previousState.periodKey || null,
        }
      : null;

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 220,
        system:
          "Você interpreta mensagens curtas de WhatsApp em pt-BR para um sistema de agendamento. " +
          "Entenda abreviações, erros de digitação e frases incompletas. " +
          "Extraia só o que for provável e nunca invente dados. " +
          "Responda somente com JSON válido, sem markdown. " +
          "Use este schema: " +
          "{\"normalizedMessage\":string,\"intentCategory\":string,\"serviceName\":string|null,\"professionalName\":string|null,\"dateReference\":string|null,\"timeReference\":string|null,\"periodReference\":string|null,\"confidence\":number}. " +
          "intentCategory deve ser um entre: scheduling, cancellation, reschedule, appointment_lookup, payment, amenities, service_info, professional_info, professional_schedule, restart, no_scheduling, affirmative, negative, out_of_scope, unknown. " +
          "confidence deve ir de 0 a 1.",
        messages: [
          {
            role: "user",
            content:
              `Contexto da empresa:\n${companyContext}\n\n` +
              `Serviços relevantes:\n${servicesSummary || "- nenhum"}\n\n` +
              `Profissionais relevantes:\n${professionalsSummary || "- nenhum"}\n\n` +
              `Estado anterior:\n${JSON.stringify(compactPreviousState || {}, null, 2)}\n\n` +
              `Nome do cliente: ${customerName || "Cliente"}\n` +
              `Mensagem do cliente: ${customerMessage}\n\n` +
              "Retorne apenas o JSON.",
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic respondeu ${response.status}: ${JSON.stringify(payload)}`);
    }

    const text = payload?.content
      ?.filter((item) => item?.type === "text")
      ?.map((item) => item.text)
      ?.join("\n");

    const parsed = safeParseJson(text || "");

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      normalizedMessage:
        typeof parsed.normalizedMessage === "string" ? trimResponse(parsed.normalizedMessage) : null,
      intentCategory:
        typeof parsed.intentCategory === "string" ? parsed.intentCategory.trim().toLowerCase() : "unknown",
      serviceName: typeof parsed.serviceName === "string" ? trimResponse(parsed.serviceName) : null,
      professionalName:
        typeof parsed.professionalName === "string" ? trimResponse(parsed.professionalName) : null,
      dateReference: typeof parsed.dateReference === "string" ? trimResponse(parsed.dateReference) : null,
      timeReference: typeof parsed.timeReference === "string" ? trimResponse(parsed.timeReference) : null,
      periodReference:
        typeof parsed.periodReference === "string" ? trimResponse(parsed.periodReference) : null,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
    };
  }

  async generateCompanyReply({ companyContext, customerName, customerMessage }) {
    if (!this.isConfigured) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 420,
        system:
          "Você responde no WhatsApp em pt-BR como atendente de agendamentos da empresa. " +
          "Escreva de forma natural, humana, cordial e objetiva, com acentuação e pontuação corretas. " +
          "Entenda muito bem abreviações, internetês, falta de acentos, erros gramaticais, erros de digitação, palavras cortadas e escrita informal do cliente. " +
          "Interprete a intenção provável do cliente mesmo quando a frase vier com português imperfeito. " +
          "Adapte o estilo de atendimento ao tipo de estabelecimento com base no contexto da empresa, serviços e profissionais. " +
          "Ajuste o tom de acordo com o contexto da empresa" +
          "Use apenas as informações fornecidas no contexto e não invente dados ausentes. " +
          "Nao tente inferir genero pelo nome do cliente. " +
          "Quando precisar de uma forma com genero, prefira construcoes inclusivas como bem-vindo(a). " +
          "Na mensagem inicial de boas-vindas, se apresentar servicos, mostre no maximo 3 opcoes e informe apenas nome, preco e duracao, sem descrever o procedimento. " +
          "Se listar servicos, cada servico deve ficar em uma unica linha, no formato: ✨ *Nome do servico* - R$ 0,00 (00 min.). " +
          "Nao adicione uma segunda linha com explicacao, beneficios, descricao ou observacoes do servico. " +
          "Prefira uma mensagem escaneavel e completa, em vez de uma lista longa. " +
          "Responda somente sobre agendamentos, horários, disponibilidade, confirmação, remarcação ou cancelamento. " +
          "Não responda nenhum dado sensível" +
          "Se a mensagem do cliente fugir desse tema, responda educadamente que por aqui você só pode ajudar com agendamentos. " +
          "Gere apenas a mensagem final que será enviada ao cliente, sem explicações extras.",
        messages: [
          {
            role: "user",
            content:
              `Contexto da empresa:\n${companyContext}\n\n` +
              `Nome do cliente: ${customerName || "Cliente"}\n` +
              `Mensagem do cliente: ${customerMessage || "(sem texto)"}\n\n` +
              "Gere apenas a resposta final para WhatsApp.",
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic respondeu ${response.status}: ${JSON.stringify(payload)}`);
    }

    const text = payload?.content
      ?.filter((item) => item?.type === "text")
      ?.map((item) => item.text)
      ?.join("\n");

    return trimResponse(text);
  }

  async humanizeAppointmentReply({
    companyContext,
    customerName,
    customerMessage,
    draftedReply,
  }) {
    if (!this.isConfigured) {
      return trimResponse(draftedReply || "");
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 420,
        system:
          "Você é um atendente humano de WhatsApp da empresa. " +
          "Reescreva a resposta para soar natural, calorosa, profissional e brasileira, com boa pontuação e acentuação. " +
          "Considere que a mensagem do cliente pode conter abreviações, erros gramaticais e digitação informal; ainda assim, preserve a intenção correta. " +
          "Adapte o tom ao que o cliente acabou de dizer. " +
          "Adapte também o estilo ao tipo de estabelecimento com base no contexto da empresa, serviços e profissionais. " +
          "Se parecer uma clínica estética, use um tom mais acolhedor, cuidadoso e consultivo. " +
          "Se parecer uma barbearia, use um tom mais direto, leve e próximo. " +
          "Se parecer um salão ou espaço de beleza, use um tom simpático, caloroso e atencioso. " +
          "Nao tente inferir genero pelo nome do cliente. " +
          "Quando precisar de uma forma com genero, prefira construcoes inclusivas como bem-vindo(a). " +
          "Se houver lista de servicos, prefira mostrar no maximo 4 itens e manter cada linha curta. " +
          "Mantenha exatamente os fatos, nomes, datas, horários, serviço, profissional e disponibilidade já presentes no rascunho. " +
          "Não invente informações novas, não remova informações importantes e não mude decisões do fluxo. " +
          "Não diga que é IA. Gere apenas a mensagem final de WhatsApp.",
        messages: [
          {
            role: "user",
            content:
              `Contexto da empresa:\n${companyContext}\n\n` +
              `Nome do cliente: ${customerName || "Cliente"}\n` +
              `Última mensagem do cliente: ${customerMessage || "(sem texto)"}\n\n` +
              `Rascunho obrigatório com os fatos corretos:\n${draftedReply || ""}\n\n` +
              "Reescreva a mensagem final sem alterar os fatos.",
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic respondeu ${response.status}: ${JSON.stringify(payload)}`);
    }

    const text = payload?.content
      ?.filter((item) => item?.type === "text")
      ?.map((item) => item.text)
      ?.join("\n");

    return trimResponse(text || draftedReply || "");
  }

  async generateStructuredAppointmentReply({
    companyContext,
    customerName,
    customerMessage,
    responseAction,
    responseData,
  }) {
    if (!this.isConfigured) {
      return "";
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 420,
        system:
          "Você é um atendente humano de WhatsApp da empresa. " +
          "Escreva a resposta final em pt-BR de forma natural, calorosa, profissional e objetiva. " +
          "Considere que a mensagem do cliente pode conter abreviações, internetês, falta de acentos e erros de digitação; interprete a intenção antes de responder. " +
          "Adapte o tom ao que o cliente acabou de dizer e ao tipo de estabelecimento com base no contexto da empresa. " +
          "Nao tente inferir genero pelo nome do cliente. " +
          "Quando precisar de uma forma com genero, prefira construcoes inclusivas como bem-vindo(a). " +
          "Se a resposta envolver apresentacao de servicos, mostre no maximo 4 opcoes e mantenha descricoes curtas. " +
          "Use o campo action para entender o objetivo da resposta e use somente os fatos do campo data. " +
          "Não invente dados, não altere nomes, datas, horários, serviço, profissional, disponibilidade ou decisão do fluxo. " +
          "Os horários listados podem ser apresentados como sugestões quando fizer sentido. " +
          "Não diga que é IA. Gere apenas a mensagem final de WhatsApp.",
        messages: [
          {
            role: "user",
            content:
              `Contexto da empresa:\n${companyContext}\n\n` +
              `Nome do cliente: ${customerName || "Cliente"}\n` +
              `Última mensagem do cliente: ${customerMessage || "(sem texto)"}\n\n` +
              `Action: ${responseAction || ""}\n` +
              `Data:\n${JSON.stringify(responseData || {}, null, 2)}\n\n` +
              "Gere a resposta final para WhatsApp usando somente esses fatos.",
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic respondeu ${response.status}: ${JSON.stringify(payload)}`);
    }

    const text = payload?.content
      ?.filter((item) => item?.type === "text")
      ?.map((item) => item.text)
      ?.join("\n");

    return trimResponse(text || "");
  }
}
