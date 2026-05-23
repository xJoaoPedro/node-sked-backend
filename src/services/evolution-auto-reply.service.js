import { AnthropicService } from "./anthropic.service.js";
import { BotInteractionService } from "./bot_interaction.service.js";
import { CompanyService } from "./company.service.js";
import { CustomerService } from "./customer.service.js";
import { EvolutionService } from "./evolution.service.js";
import { WhatsAppAppointmentAssistantService } from "./whatsapp-appointment-assistant.service.js";
import socketServer from "../socket.js";

const MESSAGE_DEDUP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_MESSAGE_AGE_SECONDS = 180;
const RECONNECT_BACKLOG_GRACE_MS = 5000;

function normalizeDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function toLocalStoragePhone(value = "") {
  const digits = normalizeDigits(value);

  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    return digits.slice(2);
  }

  if (digits.length <= 11) return digits;
  return digits.slice(-11);
}

function truncate(text = "", size = 600) {
  if (text.length <= size) return text;
  return `${text.slice(0, size - 3)}...`;
}

function formatWhatsappParagraphs(text = "") {
  return String(text)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function previewServices(services = [], limit = 3) {
  return services
    .slice(0, limit)
    .map((service) => service.name)
    .filter(Boolean)
    .join(", ");
}

function buildHumanHandoffNotice(customerName = "Cliente", customerMessage = "") {
  const preview = truncate(customerMessage, 120);

  return {
    title: "Conversa aguardando atendimento humano",
    type: "reminder",
    message: preview
      ? `${customerName} enviou uma mensagem para atendimento humano: "${preview}".`
      : `${customerName} enviou uma nova mensagem aguardando atendimento humano.`,
  };
}

export class EvolutionAutoReplyService {
  constructor() {
    this.enabled = process.env.EVOLUTION_AUTO_REPLY_ENABLED !== "false";
    this.startedAt = Date.now();
    this.maxMessageAgeMs =
      Number(process.env.EVOLUTION_AUTO_REPLY_MAX_MESSAGE_AGE_SECONDS || DEFAULT_MAX_MESSAGE_AGE_SECONDS) *
      1000;
    this.companyService = new CompanyService();
    this.customerService = new CustomerService();
    this.botInteractionService = new BotInteractionService();
    this.evolutionService = new EvolutionService();
    this.anthropicService = new AnthropicService();
    this.whatsAppAppointmentAssistantService = new WhatsAppAppointmentAssistantService();
    this.processedMessages = new Map();
    this.instanceReconnectStartedAt = new Map();
  }

  pruneProcessedMessages() {
    const now = Date.now();

    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
        this.processedMessages.delete(messageId);
      }
    }
  }

  wasProcessed(messageId) {
    this.pruneProcessedMessages();
    return this.processedMessages.has(messageId);
  }

  markProcessed(messageId) {
    this.pruneProcessedMessages();
    this.processedMessages.set(messageId, Date.now());
  }

  extractText(payloadData = {}) {
    const message = payloadData.message || {};

    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      message.buttonsResponseMessage?.selectedDisplayText ||
      message.listResponseMessage?.title ||
      message.templateButtonReplyMessage?.selectedDisplayText ||
      ""
    ).trim();
  }

  extractRemotePhone(payloadData = {}) {
    const remoteJid = payloadData?.key?.remoteJid || payloadData?.remoteJid || "";
    return normalizeDigits(remoteJid.split("@")[0] || "");
  }

  extractCustomerPhone(payloadData = {}) {
    return toLocalStoragePhone(this.extractRemotePhone(payloadData));
  }

  extractMessageId(payloadData = {}) {
    return payloadData?.key?.id || "";
  }

  extractMessageTimestamp(payloadData = {}) {
    const timestamp = payloadData?.messageTimestamp;

    if (typeof timestamp === "number") return timestamp * 1000;
    if (typeof timestamp === "string" && timestamp.trim()) return Number(timestamp) * 1000;

    if (timestamp && typeof timestamp === "object" && typeof timestamp.low === "number") {
      return Number(timestamp.low) * 1000;
    }

    return null;
  }

  extractConnectionState(body = {}) {
    return (
      body?.data?.state ||
      body?.data?.status ||
      body?.state ||
      body?.status ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();
  }

  markInstanceReconnect(instanceName, timestamp = Date.now()) {
    if (!instanceName) return;
    this.instanceReconnectStartedAt.set(instanceName, timestamp);
  }

  clearExpiredReconnectMarkers() {
    const now = Date.now();

    for (const [instanceName, timestamp] of this.instanceReconnectStartedAt.entries()) {
      if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
        this.instanceReconnectStartedAt.delete(instanceName);
      }
    }
  }

  getReconnectStartedAt(instanceName) {
    this.clearExpiredReconnectMarkers();
    return this.instanceReconnectStartedAt.get(instanceName) || null;
  }

  isStaleMessage(payloadData = {}, instanceName = "") {
    const messageTimestampMs = this.extractMessageTimestamp(payloadData);
    if (!messageTimestampMs) return false;

    const now = Date.now();
    const reconnectStartedAt = this.getReconnectStartedAt(instanceName);
    const reconnectCutoff = reconnectStartedAt
      ? reconnectStartedAt - RECONNECT_BACKLOG_GRACE_MS
      : null;
    const oldestAllowedTimestamp = Math.max(
      this.startedAt - 15 * 1000,
      now - this.maxMessageAgeMs,
    );

    return (
      messageTimestampMs < oldestAllowedTimestamp ||
      (reconnectCutoff !== null && messageTimestampMs < reconnectCutoff)
    );
  }

  isInboundDirectMessage(payloadData = {}) {
    const remoteJid = payloadData?.key?.remoteJid || "";

    if (payloadData?.key?.fromMe === true) return false;
    if (!remoteJid) return false;
    if (remoteJid.includes("@g.us")) return false;
    if (remoteJid.includes("status@broadcast")) return false;

    return true;
  }

  async resolveCompanyForInstance(instanceName) {
    const companyByInstance = await this.companyService.findByEvolutionInstanceName(instanceName);

    if (companyByInstance) {
      const liveStatus = await this.companyService
        .getEvolutionInstanceStatus(companyByInstance.id)
        .catch(() => null);

      const phoneValidation = liveStatus || this.companyService.getEvolutionPhoneValidation(
        companyByInstance.phone,
        companyByInstance.evolution_connected_phone,
        companyByInstance.evolution_connection_status === "open",
      );

      if (phoneValidation.phoneMismatch) {
        console.warn(
          `Evolution instance ${instanceName} conectada com numero divergente do cadastro da empresa ${companyByInstance.id}.`,
        );
        return null;
      }

      if (companyByInstance.evolution_auto_messages_enabled === false) {
        return null;
      }

      return companyByInstance;
    }

    const instances = await this.evolutionService.fetchInstances();
    const instance = instances.find((item) => item.name === instanceName);

    if (!instance) return null;

    const companyByPhone = await this.companyService.findByWhatsAppNumber(
      instance.number || instance.ownerJid || "",
    );

    if (companyByPhone?.evolution_auto_messages_enabled === false) {
      return null;
    }

    return companyByPhone;
  }

  buildFallbackReply(companyProfile, customerMessage) {
    const servicesPreview = previewServices(companyProfile.services || []);

    return [
      `Oi! 😊 Aqui é a equipe da ${companyProfile.fantasy_name}.`,
      customerMessage ? `Recebi sua mensagem: "${truncate(customerMessage, 80)}" 💛` : "Recebi sua mensagem 💛",
      servicesPreview
        ? `Trabalhamos com serviços como ${servicesPreview} e outras opções especiais ✨`
        : "Temos ótimas opções de atendimento para você ✨",
      "Se quiser, posso te ajudar a encontrar um horário e seguir com o seu agendamento por aqui 📅",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async buildReply({ companyProfile, customerName, customerMessage }) {
    const companyContext = this.companyService.buildWhatsAppAssistantContext(companyProfile);

    if (this.anthropicService.isConfigured) {
      try {
        const aiReply = await this.anthropicService.generateCompanyReply({
          companyContext,
          customerName,
          customerMessage,
        });

        if (aiReply) return aiReply;
      } catch (error) {
        console.error("Anthropic fallback:", error.message);
      }
    }

    return this.buildFallbackReply(companyProfile, customerMessage);
  }

  async humanizeAppointmentReply({ companyProfile, customerName, customerMessage, draftedReply }) {
    if (!draftedReply) return draftedReply;
    if (!this.anthropicService.isConfigured) return draftedReply;

    const companyContext = this.companyService.buildWhatsAppAssistantContext(companyProfile);

    try {
      return await this.anthropicService.humanizeAppointmentReply({
        companyContext,
        customerName,
        customerMessage,
        draftedReply,
      });
    } catch (error) {
      console.error("Anthropic appointment humanization:", error.message);
      return draftedReply;
    }
  }

  async generateStructuredAppointmentReply({
    companyProfile,
    customerName,
    customerMessage,
    responseAction,
    responseData,
    fallbackReply,
  }) {
    if (!responseAction || !this.anthropicService.isConfigured) {
      return fallbackReply || "";
    }

    const companyContext = this.companyService.buildWhatsAppAssistantContext(companyProfile);

    try {
      const aiReply = await this.anthropicService.generateStructuredAppointmentReply({
        companyContext,
        customerName,
        customerMessage,
        responseAction,
        responseData,
      });

      return aiReply || fallbackReply || "";
    } catch (error) {
      console.error("Anthropic structured appointment reply:", error.message);
      return fallbackReply || "";
    }
  }

  async interpretAppointmentMessage({
    companyProfile,
    customerName,
    customerMessage,
    latestInteraction,
  }) {
    const fallbackDecision = this.whatsAppAppointmentAssistantService.shouldUseInterpretationFallback({
      companyProfile,
      customerMessage,
      latestInteraction,
    });

    if (!this.anthropicService.isConfigured || !fallbackDecision.shouldUseAi) {
      return null;
    }

    const relevantServices = this.whatsAppAppointmentAssistantService.getRelevantServices(
      customerMessage,
      companyProfile?.services || [],
      5,
    );
    const relevantProfessionals = this.whatsAppAppointmentAssistantService.getRelevantProfessionals(
      customerMessage,
      companyProfile?.professionals || [],
      5,
    );
    const companyContext = [
      `Empresa: ${companyProfile?.fantasy_name || "Empresa"}`,
      companyProfile?.accepted_payment_methods?.length
        ? `Pagamentos: ${companyProfile.accepted_payment_methods.join(", ")}`
        : "",
      companyProfile?.amenities?.length
        ? `Comodidades: ${companyProfile.amenities.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const interpretation = await this.anthropicService.interpretAppointmentMessage({
        companyContext,
        customerName,
        customerMessage,
        services: relevantServices,
        professionals: relevantProfessionals,
        previousState: latestInteraction?.data?.conversationState || null,
      });

      if (interpretation) {
        return {
          ...interpretation,
          _usedAiFallback: true,
        };
      }

      return null;
    } catch (error) {
      console.error("Anthropic appointment interpretation:", error.message);
      return null;
    }
  }

  async handleWebhook(body = {}) {
    if (!this.enabled) return;
    if (body.event === "connection.update") {
      const connectionState = this.extractConnectionState(body);

      if (connectionState && connectionState !== "open") {
        this.markInstanceReconnect(body.instance || body.data?.instance || "");
      }

      if (connectionState === "open") {
        this.markInstanceReconnect(body.instance || body.data?.instance || "");
      }

      return;
    }

    if (body.event !== "messages.upsert") return;

    const payloadData = body.data || {};

    if (!this.isInboundDirectMessage(payloadData)) return;
    if (this.isStaleMessage(payloadData, body.instance)) return;

    const messageId = this.extractMessageId(payloadData);
    if (!messageId || this.wasProcessed(messageId)) return;
    if (await this.botInteractionService.findByMessageId(messageId)) {
      this.markProcessed(messageId);
      return;
    }

    const company = await this.resolveCompanyForInstance(body.instance);
    if (!company) return;

    const outboundPhone = this.extractRemotePhone(payloadData);
    const customerPhone = this.extractCustomerPhone(payloadData);
    if (!outboundPhone || !customerPhone) return;

    const typingIndicator = this.evolutionService.createTypingIndicator({
      instanceName: body.instance,
      number: outboundPhone,
    });

    try {
      const customerName = payloadData.pushName?.trim() || "Cliente";
      const customer = await this.customerService.findOrCreateByCompanyAndPhone({
        company_id: company.id,
        phone: customerPhone,
        name: customerName,
      });

      const customerMessage = this.extractText(payloadData);
      const companyProfile = await this.companyService.getWhatsAppAssistantProfile(company.id);
      const latestInteraction = await this.botInteractionService.findLatestConversation(
        company.id,
        customer.id,
      );
      const messageInterpretation = await this.interpretAppointmentMessage({
        companyProfile,
        customerName: customer.name,
        customerMessage,
        latestInteraction,
      });
      const latestInteractionData =
        latestInteraction?.data && typeof latestInteraction.data === "object"
          ? latestInteraction.data
          : {};
      const previousState =
        latestInteractionData.conversationState && typeof latestInteractionData.conversationState === "object"
          ? latestInteractionData.conversationState
          : null;
      const interpretedIntent = String(messageInterpretation?.intentCategory || "unknown").trim().toLowerCase();
      const localIntent = this.whatsAppAppointmentAssistantService.inferLocalIntent(
        customerMessage,
        previousState,
      );
      const humanHandoffRequested =
        localIntent === "human_handoff" || interpretedIntent === "human_handoff";
    const humanHandoffActive = Boolean(latestInteractionData?.humanHandoffActive);
    const shouldResumeAutomation = humanHandoffActive
      ? this.whatsAppAppointmentAssistantService.shouldResumeFromHumanHandoff(
          customerMessage,
          interpretedIntent !== "unknown" ? interpretedIntent : localIntent,
          previousState,
        )
      : false;

      if (humanHandoffRequested && !humanHandoffActive) {
        const replyText = formatWhatsappParagraphs(
          [
            "Claro! 😊",
            "Vou parar as respostas automáticas por aqui para que você possa seguir com o atendimento humano.",
            "Quando quiser voltar a falar comigo sobre agendamento, é só mandar sua mensagem por aqui novamente 💛",
          ].join("\n\n"),
        );

        await this.botInteractionService.create({
          company_id: company.id,
          client_id: customer.id,
          type: "OTHER",
          status: "IN_PROGRESS",
          data: {
            source: "evolution-webhook",
            event: body.event,
            instanceName: body.instance,
            messageId,
            remoteJid: payloadData?.key?.remoteJid || null,
            pushName: payloadData.pushName || null,
            inboundText: customerMessage || null,
            outboundText: replyText,
            humanHandoffActive: true,
            humanHandoffRequestedAt: new Date().toISOString(),
            conversationState: previousState || this.whatsAppAppointmentAssistantService.buildStatePayload({ phase: "idle" }),
          },
        });

        this.markProcessed(messageId);

        socketServer.emitNotificationToCompany(
          company.id,
          "whatsapp:human-handoff-requested",
          {
            ...buildHumanHandoffNotice(customer.name, customerMessage),
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.phone,
          },
        );

        await this.evolutionService.sendTextWithRetry({
          instanceName: body.instance,
          number: outboundPhone,
          text: replyText,
        });

        await this.evolutionService.markMessageAsRead({
          instanceName: body.instance,
          messageId,
          remoteJid: payloadData?.key?.remoteJid || "",
          fromMe: false,
        }).catch((error) => {
          console.error("Evolution markMessageAsRead error:", error.message);
        });

        return;
      }

      if (humanHandoffActive && !shouldResumeAutomation) {
        await this.botInteractionService.create({
          company_id: company.id,
          client_id: customer.id,
          type: "OTHER",
          status: "IN_PROGRESS",
          data: {
            source: "evolution-webhook",
            event: body.event,
            instanceName: body.instance,
            messageId,
            remoteJid: payloadData?.key?.remoteJid || null,
            pushName: payloadData.pushName || null,
            inboundText: customerMessage || null,
            outboundText: null,
            humanHandoffActive: true,
            humanHandoffAwaitingHumanReply: true,
            conversationState: previousState || this.whatsAppAppointmentAssistantService.buildStatePayload({ phase: "idle" }),
          },
        });

        this.markProcessed(messageId);

        socketServer.emitNotificationToCompany(
          company.id,
          "whatsapp:human-handoff-message",
          {
            ...buildHumanHandoffNotice(customer.name, customerMessage),
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.phone,
          },
        );

        return;
      }

      const appointmentReply = await this.whatsAppAppointmentAssistantService.handleMessage({
        company,
        companyProfile,
        customer,
        customerMessage,
        latestInteraction,
        messageInterpretation,
      });
      const rawReplyText = appointmentReply?.replyText || await this.buildReply({
        companyProfile,
        customerName: customer.name,
        customerMessage,
      });
      const replyText = formatWhatsappParagraphs(rawReplyText);

      await this.botInteractionService.create({
        company_id: company.id,
        client_id: customer.id,
        type: appointmentReply?.interactionType || "INQUIRY",
        status: appointmentReply?.interactionStatus || "IN_PROGRESS",
        data: {
          source: "evolution-webhook",
          event: body.event,
          instanceName: body.instance,
          messageId,
          remoteJid: payloadData?.key?.remoteJid || null,
          pushName: payloadData.pushName || null,
          inboundText: customerMessage || null,
          outboundText: replyText,
          humanHandoffActive: false,
          ...(humanHandoffActive && shouldResumeAutomation
            ? { humanHandoffResumedAt: new Date().toISOString() }
            : {}),
          ...(appointmentReply?.interactionData || {}),
        },
      });

      this.markProcessed(messageId);

      await this.evolutionService.sendTextWithRetry({
        instanceName: body.instance,
        number: outboundPhone,
        text: replyText,
      });

      await this.evolutionService.markMessageAsRead({
        instanceName: body.instance,
        messageId,
        remoteJid: payloadData?.key?.remoteJid || "",
        fromMe: false,
      }).catch((error) => {
        console.error("Evolution markMessageAsRead error:", error.message);
      });
    } finally {
      await typingIndicator.stop();
    }
  }
}
