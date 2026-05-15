import QRCode from "qrcode";

const DEFAULT_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
];

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function trimTrailingSlash(value = "") {
  return value.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export class EvolutionService {
  constructor() {
    this.baseUrl = trimTrailingSlash(process.env.EVOLUTION_API_URL || "http://localhost:8080");
    this.apiKey = process.env.EVOLUTION_API_KEY || "";
    this.defaultInstanceName = process.env.EVOLUTION_INSTANCE_NAME || "sked";
    this.instanceToken = process.env.EVOLUTION_INSTANCE_TOKEN || "";
    this.webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || "";
    this.webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET || "";
  }

  getInstanceName(instanceName) {
    return instanceName || this.defaultInstanceName;
  }

  buildWebhookConfig() {
    if (!this.webhookUrl) return {};

    const headers = {};

    if (this.webhookSecret) {
      headers["x-webhook-secret"] = this.webhookSecret;
    }

    return {
      webhook: {
        url: this.webhookUrl,
        byEvents: true,
        base64: false,
        headers,
        events: DEFAULT_WEBHOOK_EVENTS,
      },
    };
  }

  async request(path, { method = "GET", body, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) {
    if (!this.apiKey) {
      throw new Error("EVOLUTION_API_KEY nao configurada.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          apikey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const details = typeof payload === "string" ? payload : JSON.stringify(payload);
        throw new Error(`Evolution API respondeu ${response.status}: ${details}`);
      }

      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`Evolution API timeout em ${path}`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async createInstance({ instanceName, qrcode = true } = {}) {
    const normalizedInstanceName = this.getInstanceName(instanceName);

    return this.request("/instance/create", {
      method: "POST",
      body: {
        instanceName: normalizedInstanceName,
        qrcode,
        integration: "WHATSAPP-BAILEYS",
        token: this.instanceToken,
        ...this.buildWebhookConfig(),
      },
    });
  }

  async connectInstance(instanceName) {
    return this.request(`/instance/connect/${this.getInstanceName(instanceName)}`);
  }

  async logoutInstance(instanceName) {
    return this.request(`/instance/logout/${this.getInstanceName(instanceName)}`, {
      method: "DELETE",
    });
  }

  async getConnectionState(instanceName) {
    return this.request(`/instance/connectionState/${this.getInstanceName(instanceName)}`);
  }

  async fetchInstances() {
    return this.request("/instance/fetchInstances");
  }

  async findInstance(instanceName) {
    const instances = await this.fetchInstances();
    return instances.find((item) => item.name === this.getInstanceName(instanceName)) || null;
  }

  async toQrDataUrl(value) {
    const qrValue = String(value || "").trim();

    if (!qrValue) return null;
    if (qrValue.startsWith("data:image/")) return qrValue;
    if (qrValue.startsWith("data:")) return qrValue;

    const looksLikeBase64Image =
      qrValue.length > 200 &&
      /^[A-Za-z0-9+/=\s]+$/.test(qrValue) &&
      !qrValue.includes("@");

    if (looksLikeBase64Image) {
      return `data:image/png;base64,${qrValue.replace(/\s+/g, "")}`;
    }

    return QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 512,
      color: {
        dark: "#00A86B",
        light: "#FFFFFF",
      },
    });
  }

  async extractInstanceQr(instancePayload) {
    if (!instancePayload || typeof instancePayload !== "object") return null;

    const qrCandidate = (
      instancePayload?.base64 ||
      instancePayload?.qrcode?.base64 ||
      instancePayload?.qrcode?.code ||
      instancePayload?.code ||
      instancePayload?.qrCode?.base64 ||
      instancePayload?.qr ||
      null);

    return this.toQrDataUrl(qrCandidate);
  }

  extractInstancePhone(instancePayload) {
    if (!instancePayload || typeof instancePayload !== "object") return null;

    return normalizeDigits(
      instancePayload?.number ||
      instancePayload?.ownerJid ||
      instancePayload?.instance?.number ||
      "",
    ) || null;
  }

  extractInstanceProfilePicture(instancePayload) {
    if (!instancePayload || typeof instancePayload !== "object") return null;

    return (
      instancePayload?.profilePictureUrl ||
      instancePayload?.profilePicUrl ||
      instancePayload?.instance?.profilePictureUrl ||
      instancePayload?.instance?.profilePicUrl ||
      null
    );
  }

  async ensureInstance({ instanceName, qrcode = true } = {}) {
    const normalizedInstanceName = this.getInstanceName(instanceName);
    const existingInstance = await this.findInstance(normalizedInstanceName);

    if (existingInstance) {
      return {
        created: false,
        instanceName: normalizedInstanceName,
        instance: existingInstance,
      };
    }

    const createdInstance = await this.createInstance({
      instanceName: normalizedInstanceName,
      qrcode,
    });

    return {
      created: true,
      instanceName: normalizedInstanceName,
      instance: createdInstance,
    };
  }

  async getInstanceConnectionOverview(instanceName) {
    const normalizedInstanceName = this.getInstanceName(instanceName);
    const [instance, connectionState] = await Promise.all([
      this.findInstance(normalizedInstanceName),
      this.getConnectionState(normalizedInstanceName).catch(() => null),
    ]);

    const state =
      connectionState?.instance?.state ||
      instance?.connectionStatus ||
      instance?.status ||
      "close";
    const connectedPhone =
      this.extractInstancePhone(instance) || this.extractInstancePhone(connectionState);
    let profilePictureUrl =
      this.extractInstanceProfilePicture(instance) ||
      this.extractInstanceProfilePicture(connectionState);

    if (!profilePictureUrl && state === "open" && connectedPhone) {
      profilePictureUrl = await this.getProfilePictureUrl(normalizedInstanceName, connectedPhone);
    }

    return {
      instanceName: normalizedInstanceName,
      state,
      qrCode: await this.extractInstanceQr(connectionState) || await this.extractInstanceQr(instance),
      connectedPhone,
      profilePictureUrl,
      instance,
      connectionState,
    };
  }

  async ensureConnectedInstance(instanceName) {
    const ensured = await this.ensureInstance({ instanceName, qrcode: true });
    const overview = await this.getInstanceConnectionOverview(ensured.instanceName);
    let qrCode = overview.qrCode || null;

    if (overview.state !== "open") {
      const connectResponse = await this.connectInstance(ensured.instanceName).catch(() => null);
      qrCode =
        qrCode ||
        await this.extractInstanceQr(connectResponse);
    }

    const refreshedOverview = await this.getInstanceConnectionOverview(ensured.instanceName);

    return {
      ...refreshedOverview,
      qrCode: refreshedOverview.qrCode || qrCode,
    };
  }

  async waitForInstanceOpen(instanceName, { attempts = 8, intervalMs = 2000 } = {}) {
    for (let index = 0; index < attempts; index += 1) {
      const state = await this.getConnectionState(instanceName);
      const currentState = state?.instance?.state;

      if (currentState === "open") {
        return true;
      }

      await sleep(intervalMs);
    }

    return false;
  }

  async sendText({ instanceName, number, text, delay, linkPreview = false }) {
    return this.request(`/message/sendText/${this.getInstanceName(instanceName)}`, {
      method: "POST",
      body: {
        number,
        text,
        delay,
        linkPreview,
      },
    });
  }

  async markMessageAsRead({ instanceName, messageId, remoteJid, fromMe = false }) {
    if (!instanceName || !messageId || !remoteJid) return null;

    return this.request(`/chat/markMessageAsRead/${this.getInstanceName(instanceName)}`, {
      method: "POST",
      body: {
        readMessages: [
          {
            id: messageId,
            fromMe,
            remoteJid,
          },
        ],
      },
    });
  }

  async getProfilePictureUrl(instanceName, number) {
    if (!instanceName || !number) return null;

    const response = await this.request(`/chat/fetchProfilePictureUrl/${this.getInstanceName(instanceName)}`, {
      method: "POST",
      body: {
        number,
      },
    }).catch(() => null);

    return response?.profilePictureUrl || null;
  }

  async sendTextWithRetry(payload, { attempts = 3, waitForOpen = true } = {}) {
    const instanceName = this.getInstanceName(payload.instanceName);
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        if (waitForOpen) {
          await this.waitForInstanceOpen(instanceName, { attempts: 4, intervalMs: 1500 });
        }

        return await this.sendText({ ...payload, instanceName });
      } catch (error) {
        lastError = error;
        await sleep(1000 * attempt);
      }
    }

    throw lastError;
  }
}
