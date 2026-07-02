import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { EvolutionService } from "./evolution.service.js";
import socketServer from "../socket.js";
import { assertEmailAvailable, normalizeEmail } from "./email-identity.service.js";

const { PrismaClient, Prisma } = pkg 
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const socket = socketServer;
const evolutionService = new EvolutionService();

export class CompanyConflictError extends Error {}
export class RevenueTransactionConflictError extends Error {}

function normalizeDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function buildPhoneVariants(value = "") {
  const digits = normalizeDigits(value);
  const variants = new Set();

  if (!digits) return [];

  const addBrazilianNinthDigitVariants = (localDigits) => {
    if (localDigits.length === 11 && localDigits[2] === "9") {
      variants.add(`${localDigits.slice(0, 2)}${localDigits.slice(3)}`);
    }

    if (localDigits.length === 10) {
      variants.add(`${localDigits.slice(0, 2)}9${localDigits.slice(2)}`);
    }
  };

  variants.add(digits);

  if (digits.startsWith("55") && digits.length > 11) {
    const localDigits = digits.slice(2);
    variants.add(localDigits);
    addBrazilianNinthDigitVariants(localDigits);
  }

  if (digits.length >= 11) {
    const localDigits = digits.slice(-11);
    variants.add(localDigits);
    addBrazilianNinthDigitVariants(localDigits);
  }

  if (digits.length >= 10) {
    const localDigits = digits.slice(-10);
    variants.add(localDigits);
    addBrazilianNinthDigitVariants(localDigits);
  }

  return [...variants];
}

function comparePhoneVariants(firstValue = "", secondValue = "") {
  const firstVariants = new Set(buildPhoneVariants(firstValue));
  const secondVariants = new Set(buildPhoneVariants(secondValue));

  if (!firstVariants.size || !secondVariants.size) return null;

  for (const variant of firstVariants) {
    if (secondVariants.has(variant)) {
      return true;
    }
  }

  return false;
}

function hasPhoneChanged(previousPhone = "", nextPhone = "") {
  const previousDigits = normalizeDigits(previousPhone);
  const nextDigits = normalizeDigits(nextPhone);

  if (!previousDigits && !nextDigits) return false;
  if (!previousDigits || !nextDigits) return previousDigits !== nextDigits;

  return comparePhoneVariants(previousDigits, nextDigits) === false;
}

function mapRevenueStatusToPaymentStatus(status) {
  if (status === "RECEIVED") return "COMPLETED";
  if (status === "CANCELED") return "CANCELED";
  return "PENDING";
}

function getAppointmentStatusLabel(status) {
  if (status === "COMPLETED") return "Concluido";
  if (status === "CONFIRMED") return "Confirmado";
  if (status === "CANCELED") return "Cancelado";
  if (status === "NO_SHOW") return "Nao compareceu";
  return "Pendente";
}

function getPaymentMethodLabel(method) {
  if (method === "PIX") return "Pix";
  if (method === "CREDIT") return "Credito";
  if (method === "DEBIT") return "Debito";
  if (method === "CASH") return "Dinheiro";
  return method;
}

function getAvailablePaymentMethods(acceptedMethods = []) {
  const fallbackMethods = ["PIX", "CREDIT", "DEBIT", "CASH"];
  const methods = acceptedMethods.length ? acceptedMethods : fallbackMethods;

  return methods.map((value) => ({
    value,
    label: getPaymentMethodLabel(value),
  }));
}

function getRevenueValue(value) {
  return Number(value || 0);
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export class CompanyService {
  buildCompanyApprovalPayload(company) {
    const approved = Boolean(company?.approved);
    const status = approved ? "APPROVED" : (company?.status || "PENDING");
    const approveDate =
      approved ? (company?.approve_date || new Date()) : null;

    return {
      approved,
      status,
      approve_date: approveDate,
    };
  }

  getTimeZone() {
    return process.env.APP_TIMEZONE || "America/Sao_Paulo";
  }

  getMinutesInTimeZone(dateValue) {
    const date = new Date(dateValue);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: this.getTimeZone(),
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, value]),
    );

    return Number(parts.hour) * 60 + Number(parts.minute);
  }

  getEvolutionPhoneValidation(companyPhone, connectedPhone, rawConnected = false) {
    const phoneMatchesCompany = comparePhoneVariants(companyPhone, connectedPhone);
    const connected = rawConnected && phoneMatchesCompany !== false;

    return {
      companyPhone: companyPhone || null,
      connectedPhone: connectedPhone || null,
      phoneMatchesCompany,
      phoneMismatch: rawConnected && phoneMatchesCompany === false,
      rawConnected,
      connected,
    };
  }

  buildEvolutionInstanceName(company) {
    const base = slugify(company?.fantasy_name || company?.legal_name || "empresa");
    return `company-${company.id}-${base || "empresa"}`;
  }

  async disconnectMismatchedEvolutionInstance(company, overview) {
    const instanceName =
      overview?.instanceName ||
      company?.evolution_instance_name ||
      this.buildEvolutionInstanceName(company);

    await evolutionService.logoutInstance(instanceName).catch(() => null);

    const refreshedOverview = await evolutionService.ensureConnectedInstance(instanceName).catch(() => null);

    if (refreshedOverview) {
      await this.syncEvolutionInstanceFields(company.id, refreshedOverview);

      return {
        ...refreshedOverview,
        disconnectedWrongPhone: true,
        phoneMismatch: true,
        connected: false,
        connectedPhone: null,
      };
    }

    const fallbackOverview = {
      instanceName,
      state: "close",
      qrCode: overview?.qrCode || null,
      connectedPhone: null,
      disconnectedWrongPhone: true,
      phoneMismatch: true,
      connected: false,
    };

    await this.syncEvolutionInstanceFields(company.id, fallbackOverview);

    return fallbackOverview;
  }

  async syncEvolutionInstanceFields(companyId, overview) {
    if (!companyId || !overview) return null;

    const currentCompany = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        evolution_last_qr: true,
      },
    });

    return prisma.company.update({
      where: { id: Number(companyId) },
      data: {
        evolution_instance_name: overview.instanceName || null,
        evolution_connection_status: overview.state || "close",
        evolution_connected_phone: overview.connectedPhone || null,
        evolution_last_qr: overview.qrCode || currentCompany?.evolution_last_qr || null,
      },
    });
  }

  async ensureEvolutionInstanceForCompany(company) {
    const instanceName =
      company.evolution_instance_name || this.buildEvolutionInstanceName(company);

    const ensured = await evolutionService.ensureInstance({ instanceName, qrcode: true });
    const overview = await evolutionService.getInstanceConnectionOverview(ensured.instanceName);

    await this.syncEvolutionInstanceFields(company.id, {
      ...overview,
      instanceName: ensured.instanceName,
    });

    return {
      instanceName: ensured.instanceName,
      ...overview,
    };
  }

  async resetEvolutionConnectionForPhoneChange(company) {
    if (!company?.id) return null;

    const instanceName =
      company.evolution_instance_name || this.buildEvolutionInstanceName(company);

    if (company.evolution_instance_name) {
      await evolutionService.logoutInstance(instanceName).catch(() => null);
    }

    return prisma.company.update({
      where: { id: Number(company.id) },
      data: {
        evolution_instance_name: instanceName,
        evolution_connection_status: "close",
        evolution_connected_phone: null,
        evolution_last_qr: null,
      },
    });
  }

  async connectEvolutionInstanceForCompany(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        fantasy_name: true,
        legal_name: true,
        phone: true,
        evolution_instance_name: true,
      },
    });

    if (!company) return null;

    const overview = await evolutionService.ensureConnectedInstance(
      company.evolution_instance_name || this.buildEvolutionInstanceName(company),
    );

    await this.syncEvolutionInstanceFields(company.id, overview);

    const validation = this.getEvolutionPhoneValidation(
      company.phone,
      overview.connectedPhone || null,
      overview.state === "open",
    );

    if (validation.phoneMismatch) {
      const disconnectedOverview = await this.disconnectMismatchedEvolutionInstance(company, overview);

      return {
        ...disconnectedOverview,
        ...this.getEvolutionPhoneValidation(company.phone, null, false),
        disconnectedWrongPhone: true,
        phoneMismatch: true,
      };
    }

    return {
      ...overview,
      ...validation,
    };
  }

  async disconnectEvolutionInstanceForCompany(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        phone: true,
        fantasy_name: true,
        legal_name: true,
        evolution_instance_name: true,
      },
    });

    if (!company) return null;

    const instanceName =
      company.evolution_instance_name || this.buildEvolutionInstanceName(company);

    await evolutionService.logoutInstance(instanceName).catch(() => null);

    await prisma.company.update({
      where: { id: Number(companyId) },
      data: {
        evolution_instance_name: instanceName,
        evolution_connection_status: "close",
        evolution_connected_phone: null,
        evolution_last_qr: null,
      },
    });

    return {
      instanceName,
      state: "close",
      qrCode: null,
      connectedPhone: null,
      ...this.getEvolutionPhoneValidation(company.phone, null, false),
    };
  }

  async setEvolutionAutoMessagesEnabled(companyId, enabled) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        evolution_instance_name: true,
        evolution_connection_status: true,
        evolution_connected_phone: true,
        phone: true,
      },
    });

    if (!company) return null;

    await prisma.company.update({
      where: { id: Number(companyId) },
      data: {
        evolution_auto_messages_enabled: Boolean(enabled),
      },
    });

    return {
      instanceName: company.evolution_instance_name,
      status: company.evolution_connection_status || "close",
      connectedPhone: company.evolution_connected_phone || null,
      autoMessagesEnabled: Boolean(enabled),
      ...this.getEvolutionPhoneValidation(
        company.phone,
        company.evolution_connected_phone || null,
        company.evolution_connection_status === "open",
      ),
    };
  }

  async getEvolutionInstanceStatus(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        fantasy_name: true,
        legal_name: true,
        phone: true,
        evolution_instance_name: true,
        evolution_connection_status: true,
        evolution_connected_phone: true,
        evolution_last_qr: true,
      },
    });

    if (!company) return null;

    if (!company.evolution_instance_name) {
      const ensured = await this.ensureEvolutionInstanceForCompany(company);
      const validation = this.getEvolutionPhoneValidation(
        company.phone,
        ensured.connectedPhone || null,
        ensured.state === "open",
      );

      return {
        instanceName: ensured.instanceName,
        state: ensured.state || "close",
        qrCode: ensured.qrCode || null,
        connectedPhone: ensured.connectedPhone || null,
        ...validation,
      };
    }

    const overview = await evolutionService.getInstanceConnectionOverview(company.evolution_instance_name);
    await this.syncEvolutionInstanceFields(company.id, overview);

    const currentState = overview.state || company.evolution_connection_status || "close";
    const currentPhone = overview.connectedPhone || company.evolution_connected_phone || null;
    const validation = this.getEvolutionPhoneValidation(
      company.phone,
      currentPhone,
      currentState === "open",
    );

    if (validation.phoneMismatch) {
      const disconnectedOverview = await this.disconnectMismatchedEvolutionInstance(company, {
        ...overview,
        state: currentState,
        connectedPhone: currentPhone,
      });

      return {
        ...disconnectedOverview,
        ...this.getEvolutionPhoneValidation(company.phone, null, false),
        disconnectedWrongPhone: true,
        phoneMismatch: true,
      };
    }

    return {
      instanceName: overview.instanceName,
      state: currentState,
      qrCode: overview.qrCode || company.evolution_last_qr || null,
      connectedPhone: currentPhone,
      ...validation,
    };
  }

  async findByEvolutionInstanceName(instanceName) {
    if (!instanceName) return null;

    return prisma.company.findFirst({
      where: {
        evolution_instance_name: instanceName,
      },
    });
  }

  getSaoPauloDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, value]),
    );

    return parts;
  }

  getSaoPauloDateString(date = new Date()) {
    const { year, month, day } = this.getSaoPauloDateParts(date);

    return `${year}-${month}-${day}`;
  }

  getSaoPauloDayRange(date = new Date()) {
    const dateString = this.getSaoPauloDateString(date);

    return {
      start: new Date(`${dateString}T00:00:00-03:00`),
      end: new Date(`${dateString}T23:59:59.999-03:00`),
    };
  }

  getMonthStartInSaoPaulo(date = new Date()) {
    const { year, month } = this.getSaoPauloDateParts(date);

    return new Date(`${year}-${month}-01T00:00:00-03:00`);
  }

  getSameMomentLastMonth(date = new Date()) {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
    } = this.getSaoPauloDateParts(date);

    const currentYear = Number(year);
    const currentMonth = Number(month);
    const currentDay = Number(day);
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthMonth = lastMonthDate.getMonth() + 1;
    const lastMonthLastDay = new Date(lastMonthYear, lastMonthMonth, 0).getDate();
    const safeDay = String(Math.min(currentDay, lastMonthLastDay)).padStart(2, "0");
    const safeMonth = String(lastMonthMonth).padStart(2, "0");

    return new Date(
      `${lastMonthYear}-${safeMonth}-${safeDay}T${hour}:${minute}:${second}-03:00`,
    );
  }

  mapNextAppointments(appointments) {
    const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return appointments
      .sort((a, b) => a.start_time.getTime() - b.start_time.getTime())
      .map((appointment) => ({
        id: String(appointment.id),
        clientName: appointment.client.name,
        service: appointment.service.name,
        date: this.getSaoPauloDateString(appointment.start_time),
        time: timeFormatter.format(appointment.start_time),
        dateTime: appointment.start_time.toISOString(),
        status: appointment.status.toLowerCase(),
      }));
  }

  buildWeekStats(startDate, endDate, appointments) {
    const countsByDate = new Map();

    for (const appointment of appointments) {
      const date = this.getSaoPauloDateString(appointment.start_time);
      countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
    }

    const days = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const date = this.getSaoPauloDateString(cursor);
      const dow = new Date(`${date}T12:00:00-03:00`).getDay();

      days.push({
        dow,
        date,
        appointments: countsByDate.get(date) ?? 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  getPeriodStartDate(time = 'month', now = new Date()) {
    const periodsInDays = {
      week: 7,
      month: 30,
      '3months': 90,
      year: 365,
    };

    const days = periodsInDays[time] ?? periodsInDays.month;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    return startDate;
  }

  async getCustomerSummaryMetrics(id) {
    const startDate = this.getPeriodStartDate('month');

    const [totalsRaw, returningCustomersRaw] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int AS total_customers,
          COUNT(*) FILTER (WHERE first_visit >= ${startDate})::int AS new_customers
        FROM (
          SELECT
            a.client_id,
            MIN(a.start_time) AS first_visit
          FROM appointments a
          WHERE a.company_id = ${id}
            AND a.status = 'COMPLETED'
          GROUP BY a.client_id
        ) customer_visits
      `,

      prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT a.client_id
          FROM appointments a
          WHERE a.company_id = ${id}
            AND a.status = 'COMPLETED'
          GROUP BY a.client_id
          HAVING COUNT(a.id) > 1
        ) returning_customers
      `,
    ]);

    return {
      totalCustomers: Number(totalsRaw[0]?.total_customers || 0),
      newCustomers: Number(totalsRaw[0]?.new_customers || 0),
      returningCustomers: Number(returningCustomersRaw[0]?.total || 0),
    };
  }

  async getCustomerList(id, page = 1, limit = 50) {
    const customersRaw = await prisma.$queryRaw`
      SELECT
        cc.customer_id AS id,
        c.name,
        c.phone,
        COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::int AS completed_appointments,
        MAX(a.start_time) FILTER (WHERE a.status = 'COMPLETED') AS last_visit
      FROM company_customers cc
      JOIN customers c
        ON c.id = cc.customer_id
      LEFT JOIN appointments a
        ON a.company_id = cc.company_id
        AND a.client_id = cc.customer_id
      WHERE cc.company_id = ${id}
      GROUP BY cc.customer_id, c.name, c.phone
      HAVING COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') > 0
      ORDER BY last_visit DESC, c.name ASC
      OFFSET ${(page - 1) * limit}
      LIMIT ${limit}
    `;

    return customersRaw.map((customer) => ({
      id: Number(customer.id),
      name: customer.name,
      contact: customer.phone,
      visits: Number(customer.completed_appointments),
      lastVisit: customer.last_visit
        ? customer.last_visit.toISOString()
        : null,
    }));
  }

  async findAll() {
    return await prisma.company.findMany();
  }

  async findOne(id) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    return company ?? null;
  }

  async findByWhatsAppNumber(phone) {
    const variants = buildPhoneVariants(phone);

    if (variants.length === 0) return null;

    const company = await prisma.company.findFirst({
      where: {
        phone: {
          in: variants,
        },
      },
      select: {
        id: true,
        fantasy_name: true,
        phone: true,
        website: true,
        email: true,
        evolution_auto_messages_enabled: true,
      },
    });

    return company ?? null;
  }

  async getWhatsAppAssistantProfile(id) {
    const [company, services, professionals] = await Promise.all([
      prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          fantasy_name: true,
          legal_name: true,
          phone: true,
          email: true,
          website: true,
          accepted_payment_methods: true,
          amenities: true,
        },
      }),
      prisma.service.findMany({
        where: { company_id: id, status: "ACTIVE" },
        orderBy: [{ price: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          duration_minutes: true,
          price: true,
          category: true,
        },
      }),
      prisma.employee.findMany({
        where: { company_id: id, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          email: true,
        },
      }),
    ]);

    if (!company) return null;

    return {
      ...company,
      services,
      professionals,
    };
  }

  buildWhatsAppAssistantContext(companyProfile) {
    const serviceLines = companyProfile.services
      .slice(0, 12)
      .map((service) => {
        const price = Number(service.price).toFixed(2).replace(".", ",");
        const duration = service.duration_minutes ? `${service.duration_minutes} min` : "duracao nao informada";
        return `${service.name} | ${price} | ${duration}`;
      })
      .join("\n");

    const professionalLines = companyProfile.professionals
      .slice(0, 10)
      .map((professional) => `${professional.name} | ${professional.role}`)
      .join("\n");

    return [
      `Empresa: ${companyProfile.fantasy_name}`,
      companyProfile.legal_name ? `Razao social: ${companyProfile.legal_name}` : "",
      companyProfile.phone ? `Telefone: ${companyProfile.phone}` : "",
      companyProfile.email ? `Email: ${companyProfile.email}` : "",
      companyProfile.website ? `Site: ${companyProfile.website}` : "",
      companyProfile.accepted_payment_methods?.length
        ? `Pagamentos: ${companyProfile.accepted_payment_methods.join(", ")}`
        : "",
      companyProfile.amenities?.length
        ? `Comodidades: ${companyProfile.amenities.join(", ")}`
        : "",
      serviceLines ? `Servicos:\n${serviceLines}` : "Servicos: nao informados",
      professionalLines ? `Profissionais:\n${professionalLines}` : "Profissionais: nao informados",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async create(company) {
    const {
      legal_name, fantasy_name, cnpj,
      password, phone, photo, website, accepted_payment_methods, amenities,
      low_stock_threshold,
      plan,
    } = company;
    const email = normalizeEmail(company.email);

    const existingCompanyWithPhone = await prisma.company.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (existingCompanyWithPhone) {
      throw new CompanyConflictError("Este telefone já está sendo usado");
    }

    await assertEmailAvailable(prisma, email);

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdCompany;

    try {
      createdCompany = await prisma.company.create({
        data: {
          legal_name, fantasy_name, cnpj, email,
          password: hashedPassword, phone, photo, website, accepted_payment_methods, amenities,
          low_stock_threshold,
          plan,
          ...this.buildCompanyApprovalPayload({ approved: false }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target || "");

        if (target.includes("email")) {
          await assertEmailAvailable(prisma, email);
        }

        throw new CompanyConflictError("Este telefone já está sendo usado");
      }

      throw error;
    }

    try {
      await this.ensureEvolutionInstanceForCompany(createdCompany);
    } catch (error) {
      console.error("Erro ao provisionar instancia da Evolution para a empresa:", error.message);
    }

    return createdCompany;
  }

  emitCompanyUpdatedEvent(company, options = {}) {
    const payload = {
      id: company.id,
      company_id: company.id,
      fantasy_name: company.fantasy_name,
      email: company.email,
      phone: company.phone,
      photo: company.photo,
      website: company.website,
      low_stock_threshold: company.low_stock_threshold,
      created_at: company.updated_at ?? new Date().toISOString(),
      title: "Configurações atualizadas",
      message: "Os dados da empresa foram atualizados em outra sessão.",
      type: "success",
    };

    socket.emitNotificationToCompany(company.id, "company:updated", payload, options);
    socket.emitToCompany(
      company.id,
      "dashboard:updated",
      {
        company_id: company.id,
        source: "company",
        event: "company:updated",
        created_at: new Date().toISOString(),
      },
      options,
    );
  }

  async update(id, data, options = {}) {
    try {
      const nextData = { ...data };
      const currentCompany = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          phone: true,
          fantasy_name: true,
          legal_name: true,
          evolution_instance_name: true,
        },
      });

      if (!currentCompany) {
        return false;
      }

      const nextPhone = nextData.phone ?? currentCompany.phone ?? "";
      const shouldResetEvolutionConnection = hasPhoneChanged(currentCompany.phone, nextPhone);

      if (typeof nextData.email === "string") {
        nextData.email = normalizeEmail(nextData.email);
        await assertEmailAvailable(prisma, nextData.email, {
          excludeCompanyId: id,
        });
      }

      if (typeof nextData.password === "string") {
        if (nextData.password.length > 0) {
          nextData.password = await bcrypt.hash(nextData.password, 10);
        } else {
          delete nextData.password;
        }
      }

      if (nextData.phone && nextData.phone !== currentCompany.phone) {
        const existingCompanyWithPhone = await prisma.company.findFirst({
          where: {
            phone: nextData.phone,
            id: { not: id },
          },
          select: { id: true },
        });

        if (existingCompanyWithPhone) {
          throw new CompanyConflictError("Este telefone já está sendo usado");
        }
      }

      let updatedCompany = await prisma.company.update({
        where: { id },
        data: nextData,
      });

      if (shouldResetEvolutionConnection) {
        updatedCompany = await this.resetEvolutionConnectionForPhoneChange({
          ...updatedCompany,
          evolution_instance_name: currentCompany.evolution_instance_name,
        });
      }

      this.emitCompanyUpdatedEvent(updatedCompany, options);

      return {
        phoneChanged: shouldResetEvolutionConnection,
      };
    } catch (error) {
      if (error instanceof CompanyConflictError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new CompanyConflictError("Este telefone já está sendo usado");
      }

      return false;
    }
  }

  async delete(id) {
    try {
      await prisma.company.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async login(credentials, res) {
    const { password } = credentials;
    const email = normalizeEmail(credentials.email);
    
    const company = await prisma.company.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (!company) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, company.password);

    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    const approval = this.buildCompanyApprovalPayload(company);

    return {
      token: jwt.sign(
        {
          company_id: company.id,
          auth_type: "company",
          approved: approval.approved,
          status: approval.status,
          approve_date: approval.approve_date,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      ),
      id: company.id,
      approved: approval.approved,
      status: approval.status,
      approve_date: approval.approve_date,
    };
  }

  async findPendingApprovals() {
    return prisma.company.findMany({
      where: {
        approved: false,
      },
      select: {
        id: true,
        legal_name: true,
        fantasy_name: true,
        cnpj: true,
        email: true,
        phone: true,
        created_at: true,
        approved: true,
        status: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  }

  async approveCompany(id) {
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!company) return null;

    return prisma.company.update({
      where: { id },
      data: {
        ...this.buildCompanyApprovalPayload({ approved: true }),
      },
      select: {
        id: true,
        fantasy_name: true,
        legal_name: true,
        approved: true,
        status: true,
        approve_date: true,
      },
    });
  }

  async getCompanyApprovalSession(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        approved: true,
        status: true,
        approve_date: true,
      },
    });

    if (!company) return null;

    return {
      company_id: company.id,
      auth_type: "company",
      ...this.buildCompanyApprovalPayload(company),
    };
  }

  async getAllData(id, options = {}) {
    const employeeId = Number(options.employeeId || 0) || null;
    const isEmployeeScoped = Boolean(employeeId);
    const [
      dashboard,
      dailySchedules,
      appointments,
      cancellations,
      revenue,
      // commissions
      // reports
      products,
      services,
      professionals,
      customers,
      settings
    ] = await Promise.all([
      isEmployeeScoped ? null : this.getDashboard(id),
      this.getDailySchedules(id, { employeeId }),
      this.getAppointments(id, 1, 50, {}, { employeeId }),
      isEmployeeScoped ? null : this.getInitialCancellations(id),
      isEmployeeScoped ? null : this.getInitialRevenues(id),
      // commissions
      // reports
      this.getProducts(id),
      this.getServices(id),
      this.getProfessionals(id, { employeeId }),
      this.getInitialCustomers(id),
      this.getSettings(id)
    ])

    return {
      dashboard,
      dailySchedules,
      appointments,
      cancellations,
      revenue,
      // comissions
      // reports
      products,
      services,
      professionals,
      customers,
      settings
    }
  }

  async getDashboard(id) {
    const now = new Date();
    const { start: startOfDay, end: endOfDay } = this.getSaoPauloDayRange(now);
    const startOfMonth = this.getMonthStartInSaoPaulo(now);
    const sameMomentLastMonth = this.getSameMomentLastMonth(now);
    const startOfLastMonth = this.getMonthStartInSaoPaulo(sameMomentLastMonth);
    const startWeek = this.getSaoPauloDayRange(
      new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)),
    ).start;
    const endWeek = this.getSaoPauloDayRange(
      new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)),
    ).end;

    const [
      totalToday,
      totalClients,
      monthClients,
      totalClientsBeforeThisMonth,
      monthlyRevenueRaw,
      lastMonthRevenueRaw,
      canceledCount,
      totalMonthAppointments,
      lastMonthCanceledCount,
      lastMonthAppointments,
      weekAppointments,
      topServices,
      appointments,
      revenueLast6MonthsRaw
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startOfDay, lt: endOfDay },
          status: "CONFIRMED",
        },
      }),

      prisma.appointment.findMany({
        where: { company_id: id },
        select: { client_id: true },
        distinct: ["client_id"],
      }),

	      prisma.appointment.findMany({
	        where: {
	          company_id: id,
	          start_time: {
	            gte: startOfMonth,
	            lte: now,
	          },
	        },
	        select: { client_id: true },
        distinct: ["client_id"],
      }),

      prisma.appointment.findMany({
        where: {
          company_id: id,
          start_time: {
            lt: startOfMonth,
          },
        },
        select: { client_id: true },
        distinct: ["client_id"],
      }),

	      prisma.$queryRaw`
	        SELECT COALESCE(SUM(s.price), 0) as total
	        FROM appointments a
	        JOIN services s ON s.id = a.service_id
	        WHERE a.company_id = ${id}
	          AND a.start_time >= ${startOfMonth}
	          AND a.start_time <= ${now}
	          AND a.status = 'COMPLETED'
	      `,

	      prisma.$queryRaw`
	        SELECT COALESCE(SUM(s.price), 0) as total
	        FROM appointments a
	        JOIN services s ON s.id = a.service_id
	        WHERE a.company_id = ${id}
	          AND a.start_time >= ${startOfLastMonth}
	          AND a.start_time <= ${sameMomentLastMonth}
	          AND a.status = 'COMPLETED'
	      `,

      prisma.appointment.count({
        where: {
          company_id: id,
          status: "CANCELED",
        },
      }),

      prisma.appointment.count({
        where: {
          company_id: id,
        },
      }),

      prisma.appointment.count({
	        where: {
	          company_id: id,
	          start_time: { gte: startOfLastMonth, lte: sameMomentLastMonth },
	          status: "CANCELED",
	        },
	      }),

      prisma.appointment.count({
	        where: {
	          company_id: id,
	          start_time: { gte: startOfLastMonth, lte: sameMomentLastMonth },
	        },
	      }),

	      prisma.appointment.findMany({
	        where: {
	          company_id: id,
	          start_time: {
	            gte: startWeek,
	            lte: endWeek,
	          },
            status: "CONFIRMED",
	        },
	        select: {
	          start_time: true,
	        },
	      }),

      prisma.$queryRaw`
	        SELECT 
	          s.id,
	          s.name, 
	          COUNT(a.id)::int AS total
	        FROM services s
	        LEFT JOIN appointments a 
	          ON a.service_id = s.id
	          AND a.company_id = ${id}
	        WHERE s.company_id = ${id}
	        GROUP BY s.id, s.name
	        ORDER BY total DESC, s.name ASC
	      `,

	      prisma.appointment.findMany({
	        where: {
	          company_id: id,
	          start_time: { gte: now },
	          status: "CONFIRMED",
	        },
	        orderBy: { start_time: "asc" },
	        include: {
          service: true,
          client: true,
        },
      }),

      prisma.$queryRaw`
        SELECT
          TO_CHAR(a.start_time, 'YYYY-MM') as month,
          COALESCE(SUM(s.price), 0)::float as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.start_time >= NOW() - INTERVAL '5 months'
          AND a.status = 'COMPLETED'
        GROUP BY month
        ORDER BY month
      `
    ])

    function calcPercentage(current, previous) {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const monthlyRevenue = Number(monthlyRevenueRaw[0]?.total || 0)
    const lastMonthRevenue = Number(lastMonthRevenueRaw[0]?.total || 0)

    const cancelRate =
      totalMonthAppointments > 0
        ? (canceledCount / totalMonthAppointments) * 100
      : 0

    const lastMonthCancelRate =
      lastMonthAppointments > 0
        ? (lastMonthCanceledCount / lastMonthAppointments) * 100
      : 0

    const clientsPercentage = calcPercentage(
      totalClients.length,
      totalClientsBeforeThisMonth.length
    )

    const revenuePercentage = calcPercentage(
      monthlyRevenue,
      lastMonthRevenue
    )

    const cancelPercentage = calcPercentage(
      cancelRate,
      lastMonthCancelRate
    )

    const { fantasy_name } = await prisma.company.findUnique({
      where: { id },
      select: { fantasy_name: true }
    });

	    const nextAppointments = this.mapNextAppointments(appointments);

	    const revenueLastMonths = revenueLast6MonthsRaw.map((item) => ({
	      month: item.month,
	      total: Number(item.total),
	    }))

    const weekStats = this.buildWeekStats(startWeek, endWeek, weekAppointments);

	    return {
      companyName: fantasy_name,
      totalToday,
      totalClients: totalClients.length,
      monthClients: monthClients.length,
      monthlyRevenue,
      cancelRate,
      clientsPercentage,
      revenuePercentage,
      cancelPercentage,
      revenueLastMonths,
      weekStats,
      topServices,
      nextAppointments,
    }
  }

  async getDailySchedules(id, options = {}) {
    const employeeId = Number(options.employeeId || 0) || null;
    const { start: startOfDay, end: endOfDay } = this.getSaoPauloDayRange();

    const appointments = await prisma.appointment.findMany({
      where: {
        company_id: id,
        ...(employeeId ? { employee_id: employeeId } : {}),
        start_time: { gte: startOfDay, lte: endOfDay, },
      },
      orderBy: { start_time: "asc" },
      include: {
        service: true,
        client: true,
      },
    });

    const professionals = await prisma.employee.findMany({
      where: {
        company_id: id,
        ...(employeeId ? { id: employeeId } : {}),
      },
      include: { user: true, },
    });

    return {
      id,
      appointments,
      professionals
    }
  }

  buildAppointmentFiltersWhere(id, filters = {}, options = {}) {
    const where = {
      company_id: id,
      ...(options.employeeId ? { employee_id: Number(options.employeeId) } : {}),
    };

    if (filters.id) {
      where.id = {
        equals: Number(filters.id),
      };
    } else if (filters.excludeId) {
      where.id = {
        not: Number(filters.excludeId),
      };
    }

    if (filters.date) {
      const baseDate = filters.date;

      let start = new Date(`${baseDate}T00:00:00-03:00`);
      let end = new Date(`${baseDate}T23:59:59-03:00`);

      if (filters.timeStart) {
        const [h, m] = filters.timeStart.split(':');
        start = new Date(`${baseDate}T${h}:${m}:00-03:00`);
      }

      if (filters.timeEnd) {
        const [h, m] = filters.timeEnd.split(':');
        end = new Date(`${baseDate}T${h}:${m}:59-03:00`);
      }

      where.start_time = {
        gte: start,
        lte: end,
      };
    }

    if (filters.service) {
      where.service = {
        name: filters.service,
      };
    }

    if (filters.client) {
      where.client = {
        name: {
          contains: filters.client,
          mode: 'insensitive',
        },
      };
    }

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters.employeeId && !options.employeeId) {
      where.employee_id = Number(filters.employeeId);
    }

    return where;
  }

  getAppointmentTimeFilterMinutes(timeValue) {
    if (!timeValue || typeof timeValue !== "string" || !timeValue.includes(":")) {
      return null;
    }

    const [hours, minutes] = timeValue.split(":").map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  matchesAppointmentTimeFilters(appointment, filters = {}) {
    const startMinutes = this.getAppointmentTimeFilterMinutes(filters.timeStart);
    const endMinutes = this.getAppointmentTimeFilterMinutes(filters.timeEnd);

    if (startMinutes === null && endMinutes === null) {
      return true;
    }

    const appointmentMinutes = this.getMinutesInTimeZone(appointment.start_time);

    if (startMinutes !== null && appointmentMinutes < startMinutes) {
      return false;
    }

    if (endMinutes !== null && appointmentMinutes > endMinutes) {
      return false;
    }

    return true;
  }

  async getAppointments(id, page = 1, limit = 50, filters = {}, options = {}) {
    const hasFilter = Boolean(
      filters.id ||
      filters.date ||
      filters.service ||
      filters.client ||
      filters.status ||
      filters.employeeId ||
      filters.excludeId ||
      filters.timeStart ||
      filters.timeEnd
    );
    const where = this.buildAppointmentFiltersWhere(id, filters, options);
    const shouldFilterByTimeOnlyInMemory =
      !filters.date && (filters.timeStart || filters.timeEnd);

    page = hasFilter ? 1 : Number(page);

    if (shouldFilterByTimeOnlyInMemory) {
      const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { start_time: "desc" },
        include: {
          client: true,
          service: true,
          employee: true,
        },
      });

      const filteredAppointments = appointments.filter((appointment) =>
        this.matchesAppointmentTimeFilters(appointment, filters),
      );
      const total = filteredAppointments.length;
      const paginatedAppointments = filteredAppointments.slice(
        (page - 1) * Number(limit),
        page * Number(limit),
      );

      return {
        data: paginatedAppointments,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * Number(limit),
        take: Number(limit),
        orderBy: { start_time: "desc" },
        include: {
          client: true,
          service: true,
          employee: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),

    };
  }

  async exportAppointments(id, filters = {}, options = {}) {
    const where = this.buildAppointmentFiltersWhere(id, filters, options);
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { start_time: "desc" },
      include: {
        client: true,
        service: true,
        employee: true,
      },
    });

    if (!filters.date && (filters.timeStart || filters.timeEnd)) {
      return appointments.filter((appointment) =>
        this.matchesAppointmentTimeFilters(appointment, filters),
      );
    }

    return appointments;
  }

  async getServices(id) {
    const services = await prisma.service.findMany({
      where: {
        company_id: id,
      },
    });

    return services;
  }

  async getCancellations(id, page = 1, limit = 50, time = 'month') {
    page = Number(page);
    const now = new Date();
    const startDate = this.getPeriodStartDate(time, now);


    const where = {
      company_id: id,
      status: "CANCELED",
      start_time: {
        gte: startDate,
        lte: now,
      },
    };

    const [cancellations, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { start_time: "desc" },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
        include: {
          client: true,
          service: true,
          employee: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: cancellations.map((a) => ({
        id: a.id,
        clientName: a.client.name,
        serviceName: a.service.name,
        professionalName: a.employee.name,
        date: a.start_time.toISOString(),
        reason: a.cancel_reason,
      })),
    };
  }

  async getInitialCancellations(id, page = 1, limit = 50, time = 'month') {
    const now = new Date();
    const startDate = this.getPeriodStartDate(time, now);

    const [
      totalCancellations,
      totalAppointments,
      lostRevenueRaw,
      cancellationsByMonthRaw,
      cancellationsByServiceRaw,
      cancellationsByProfessionalRaw,
      cancellationsByReasonRaw,
      recentCancellations
    ] = await Promise.all([
      // 🔹 total cancelamentos
      prisma.appointment.count({
        where: {
          company_id: id,
          status: "CANCELED",
          start_time: { gte: startDate, lte: now },
        },
      }),

      // 🔹 total agendamentos
      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startDate, lte: now },
        },
      }),

      // 🔹 faturamento perdido
      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.price), 0) as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status = 'CANCELED'
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${now}
      `,

      // 🔹 gráfico (fixo 6 meses)
      prisma.$queryRaw`
        WITH months AS (
          SELECT TO_CHAR(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months' + (n || ' month')::interval, 'YYYY-MM') AS month
          FROM generate_series(0, 5) AS n
        )
        SELECT 
          m.month,
          COALESCE(COUNT(a.id), 0)::int AS total
        FROM months m
        LEFT JOIN appointments a
          ON TO_CHAR(a.start_time, 'YYYY-MM') = m.month
          AND a.company_id = ${id}
          AND a.status = 'CANCELED'
        GROUP BY m.month
        ORDER BY m.month
      `,

      // 🔹 por serviço
      prisma.$queryRaw`
        SELECT 
          s.name,
          COUNT(a.id)::int as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status = 'CANCELED'
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${now}
        GROUP BY s.name
        ORDER BY total DESC
      `,

      // 🔹 por profissional
      prisma.$queryRaw`
        SELECT 
          e.name,
          COUNT(a.id) FILTER (WHERE a.status = 'CANCELED')::int as cancellations,
          COUNT(a.id)::int as total
        FROM employees e
        LEFT JOIN appointments a
          ON a.employee_id = e.id
          AND a.company_id = ${id}
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${now}
        WHERE e.company_id = ${id}
        GROUP BY e.id, e.name
        ORDER BY cancellations DESC, e.name ASC
      `,

      // 🔹 por motivo
      prisma.$queryRaw`
        SELECT 
          a.cancel_reason as reason,
          COUNT(a.id)::int as total
        FROM appointments a
        WHERE a.company_id = ${id}
          AND a.status = 'CANCELED'
          AND a.cancel_reason IS NOT NULL
          AND a.start_time >= ${startDate}
          AND a.start_time <= ${now}
        GROUP BY a.cancel_reason
        ORDER BY total DESC
      `,

      // 🔹 recentes
      prisma.appointment.findMany({
        where: {
          company_id: id,
          status: "CANCELED",
          start_time: { gte: startDate, lte: now },
        },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
        orderBy: { start_time: "desc" },
        include: {
          service: true,
          client: true,
          employee: true,
        },
      }),
    ]);

    const cancelRate = totalAppointments > 0
        ? (totalCancellations / totalAppointments) * 100
        : 0;

    const lostRevenue = Number(lostRevenueRaw[0]?.total || 0);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const cancellationsByMonth = cancellationsByMonthRaw.map((item) => {
      const [year, month] = item.month.split('-');
      return {
        month: monthNames[parseInt(month, 10) - 1],
        year: parseInt(year, 10),
        total: Number(item.total),
      };
    });

    const cancellationsByService = cancellationsByServiceRaw.map((item) => ({
      service: item.name,
      total: Number(item.total),
    }));

    const cancellationsByProfessional = cancellationsByProfessionalRaw.map((item) => {
      const total = Number(item.total);
      const cancellations = Number(item.cancellations);
      return {
        name: item.name,
        total,
        cancellations,
        rate: total > 0 ? (cancellations / total) * 100 : 0,
      };
    });

    const reasonLabels = {
      NO_SHOW: "Não compareceu",
      SCHEDULE_CONFLICT: "Conflito de agenda",
      ILLNESS: "Doença",
      EMERGENCY: "Emergência",
      PROFESSIONAL_UNAVAILABLE: "Profissional indisponível",
      OTHER: "Outro",
    };

    const cancellationsByReason = cancellationsByReasonRaw.map((item) => ({
      reason: reasonLabels[item.reason] || item.reason,
      total: Number(item.total),
      percentage: totalCancellations > 0 ? (Number(item.total) / totalCancellations) * 100 : 0,
    }));

    return {
      totalCancellations,
      cancelRate,
      lostRevenue,
      cancellationsByMonth,
      cancellationsByService,
      cancellationsByProfessional,
      cancellationsByReason,
      recentCancellations: recentCancellations.map((a) => ({
        id: a.id,
        clientName: a.client.name,
        serviceName: a.service.name,
        professionalName: a.employee.name,
        date: a.start_time.toISOString(),
        reason: a.cancel_reason,
      })),
    };
  }

  normalizeTransactionRevenueEntry(transaction) {
    return {
      id: String(transaction.id),
      date: transaction.occurred_at.toISOString(),
      clientName: transaction.client?.name || "-",
      serviceName:
        transaction.service?.name ||
        transaction.description ||
        (transaction.origin === "MANUAL" ? "Lançamento manual" : "Receita vinculada"),
      professionalName: transaction.employee?.name || "-",
      paymentMethod: transaction.payment_method,
      value: getRevenueValue(transaction.amount),
      status: mapRevenueStatusToPaymentStatus(transaction.status),
      description: transaction.description || "",
      appointmentId: transaction.appointment_id ?? null,
    };
  }

  normalizeAppointmentRevenueEntry(appointment) {
    return {
      id: String(appointment.id),
      date: appointment.start_time.toISOString(),
      clientName: appointment.client?.name || "-",
      serviceName: appointment.service?.name || "-",
      professionalName: appointment.employee?.name || "-",
      paymentMethod: appointment.payment_method,
      value: getRevenueValue(appointment.service?.price),
      status: appointment.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      description: "",
      appointmentId: appointment.id,
    };
  }

  async getAppointmentRevenueSummary(appointmentId, tx = prisma) {
    const aggregate = await tx.revenueTransaction.aggregate({
      where: {
        appointment_id: Number(appointmentId),
        status: { not: "CANCELED" },
      },
      _sum: {
        amount: true,
      },
    });

    return roundCurrency(aggregate._sum.amount || 0);
  }

  async getRevenueAppointmentOptions(companyId, limit = 100) {
    const [company, appointments] = await Promise.all([
      prisma.company.findUnique({
        where: { id: Number(companyId) },
        select: { accepted_payment_methods: true },
      }),
      prisma.appointment.findMany({
        where: {
          company_id: Number(companyId),
          status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        },
        orderBy: { start_time: "desc" },
        take: Number(limit),
        include: {
          client: {
            select: { id: true, name: true },
          },
          employee: {
            select: { id: true, name: true },
          },
          service: {
            select: { id: true, name: true, price: true },
          },
        },
      }),
    ]);

    const summaries = await Promise.all(
      appointments.map(async (appointment) => {
        const paidAmount = await this.getAppointmentRevenueSummary(appointment.id);
        const serviceAmount = roundCurrency(appointment.service?.price || 0);
        const remainingAmount = roundCurrency(Math.max(serviceAmount - paidAmount, 0));

        return {
          appointmentId: appointment.id,
          date: appointment.start_time.toISOString(),
          clientId: appointment.client?.id ?? null,
          clientName: appointment.client?.name ?? "-",
          employeeId: appointment.employee?.id ?? null,
          professionalName: appointment.employee?.name ?? "-",
          serviceId: appointment.service?.id ?? null,
          serviceName: appointment.service?.name ?? "-",
          serviceAmount,
          paidAmount,
          remainingAmount,
          status: appointment.status,
          statusLabel: getAppointmentStatusLabel(appointment.status),
        };
      }),
    );

    return {
      appointments: summaries.filter((item) => item.remainingAmount > 0),
      availablePaymentMethods: getAvailablePaymentMethods(
        company?.accepted_payment_methods || [],
      ),
    };
  }

  async getRevenueEntries(id, startDate, endDate, options = {}) {
    const includeHistoricalAppointments = options.includeHistoricalAppointments ?? true;
    const transactions = await prisma.revenueTransaction.findMany({
      where: {
        company_id: Number(id),
        occurred_at: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: "CANCELED" },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true },
        },
        employee: {
          select: { id: true, name: true },
        },
      },
    });

    const linkedAppointmentIds = transactions
      .map((transaction) => transaction.appointment_id)
      .filter(Boolean);

    const appointments = includeHistoricalAppointments
      ? await prisma.appointment.findMany({
          where: {
            company_id: Number(id),
            status: { in: ["COMPLETED", "PENDING", "CONFIRMED"] },
            payment_method: { not: null },
            start_time: {
              gte: startDate,
              lte: endDate,
            },
            ...(linkedAppointmentIds.length
              ? { id: { notIn: linkedAppointmentIds } }
              : {}),
          },
          include: {
            client: {
              select: { id: true, name: true },
            },
            service: {
              select: { id: true, name: true, price: true },
            },
            employee: {
              select: { id: true, name: true },
            },
          },
        })
      : [];

    return [
      ...transactions.map((transaction) => this.normalizeTransactionRevenueEntry(transaction)),
      ...appointments.map((appointment) => this.normalizeAppointmentRevenueEntry(appointment)),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createRevenueTransaction(companyId, payload, options = {}) {
    const nextCompanyId = Number(companyId);
    const {
      appointment_id,
      amount,
      payment_method,
      status,
      description,
      occurred_at,
    } = payload;

    const [company, appointment] = await Promise.all([
      prisma.company.findUnique({
        where: { id: nextCompanyId },
        select: { accepted_payment_methods: true },
      }),
      prisma.appointment.findUnique({
        where: { id: Number(appointment_id) },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      }),
    ]);

    if (!appointment || appointment.company_id !== nextCompanyId) {
      throw new Error("Agendamento não encontrado para a empresa informada");
    }

    if (
      company?.accepted_payment_methods?.length &&
      !company.accepted_payment_methods.includes(payment_method)
    ) {
      throw new RevenueTransactionConflictError(
        "A forma de pagamento informada nao esta ativa para esta empresa",
      );
    }

    if (!appointment.service) {
      throw new Error("O agendamento informado não possui serviço vinculado");
    }

    if (appointment.status === "CANCELED") {
      throw new Error("Não é possível registrar transações para um agendamento cancelado");
    }

    try {
      const createdTransactionId = await prisma.$transaction(async (tx) => {
        const currentPaidAmount = await this.getAppointmentRevenueSummary(appointment.id, tx);
        const serviceAmount = roundCurrency(appointment.service?.price || 0);
        const nextAmount = roundCurrency(amount);
        const nextTotalAmount = roundCurrency(currentPaidAmount + nextAmount);

        if (nextTotalAmount > serviceAmount) {
          const remainingAmount = roundCurrency(Math.max(serviceAmount - currentPaidAmount, 0));

          throw new RevenueTransactionConflictError(
            remainingAmount > 0
              ? `Esse serviço possui apenas ${remainingAmount.toFixed(2)} disponível para lançamento`
              : "Esse serviço já teve o valor total lançado",
          );
        }

        const transaction = await tx.revenueTransaction.create({
          data: {
            company_id: nextCompanyId,
            appointment_id: appointment.id,
            client_id: appointment.client_id,
            employee_id: appointment.employee_id,
            service_id: appointment.service_id,
            description:
              description || "Receita registrada a partir do agendamento",
            amount,
            payment_method,
            status,
            origin: "APPOINTMENT",
            occurred_at,
          },
        });

        await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            payment_method,
          },
        });

        return transaction.id;
      });

      const createdTransaction = await prisma.revenueTransaction.findUnique({
        where: { id: createdTransactionId },
        include: {
          client: {
            select: { id: true, name: true },
          },
          service: {
            select: { id: true, name: true },
          },
          employee: {
            select: { id: true, name: true },
          },
        },
      });

      if (!createdTransaction) {
        throw new Error("Não foi possível localizar a transação criada");
      }

      return this.normalizeTransactionRevenueEntry(createdTransaction);
    } catch (error) {
      if (error instanceof RevenueTransactionConflictError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target
          : [error.meta?.target].filter(Boolean);

        if (target.includes("appointment_id")) {
          throw new RevenueTransactionConflictError(
            "Este ambiente ainda está limitando um lançamento por agendamento. Remova a constraint única de appointment_id em revenue_transactions.",
          );
        }

        throw new RevenueTransactionConflictError("Não foi possível registrar a transação");
      }

      throw error;
    }
  }

  async getRevenues(id, page = 1, limit = 50, time = 'month') {
    page = Number(page);
    const parsedLimit = Number(limit);
    const now = new Date();
    const startDate = this.getPeriodStartDate(time, now);
    const entries = await this.getRevenueEntries(id, startDate, now, {
      includeHistoricalAppointments: false,
    });
    const total = entries.length;
    const payments = entries.slice((page - 1) * parsedLimit, page * parsedLimit);

    return {
      page,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      data: payments,
    };
  }

  async getInitialRevenues(id, page = 1, limit = 50, time = 'month') {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = this.getPeriodStartDate(time, now);
    const [periodEntries, lastSixMonthEntries] = await Promise.all([
      this.getRevenueEntries(id, startDate, now, {
        includeHistoricalAppointments: false,
      }),
      this.getRevenueEntries(id, sixMonthsAgo, now, {
        includeHistoricalAppointments: false,
      }),
    ]);

    const receivedEntries = periodEntries.filter((entry) => entry.status === "COMPLETED");
    const pendingEntries = periodEntries.filter((entry) => entry.status === "PENDING");
    const totalTransactions = periodEntries.length;
    const revenueReceived = receivedEntries.reduce((sum, entry) => sum + entry.value, 0);
    const revenuePending = pendingEntries.reduce((sum, entry) => sum + entry.value, 0);
    const avgTicket = receivedEntries.length > 0 ? revenueReceived / receivedEntries.length : 0;

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const revenueByMonthMap = new Map();

    lastSixMonthEntries
      .filter((entry) => entry.status === "COMPLETED")
      .forEach((entry) => {
        const date = new Date(entry.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        revenueByMonthMap.set(key, (revenueByMonthMap.get(key) || 0) + entry.value);
      });

    const revenueByMonth = [...revenueByMonthMap.entries()].map(([key, total]) => {
      const [, month] = key.split('-');
      return {
        month: monthNames[parseInt(month, 10) - 1],
        total,
      };
    });

    const revenueByPaymentMap = new Map();
    receivedEntries.forEach((entry) => {
      revenueByPaymentMap.set(
        entry.paymentMethod,
        (revenueByPaymentMap.get(entry.paymentMethod) || 0) + entry.value,
      );
    });

    const revenueByPayment = [...revenueByPaymentMap.entries()].map(([method, total]) => ({
      method,
      total,
    }));

    return {
      revenueReceived,
      revenuePending,
      avgTicket,
      totalTransactions,
      revenueByMonth,
      revenueByPayment,
      recentPayments: periodEntries.slice(0, 50),
    };
  }

  async getProducts(id) {
    const [company, products] = await Promise.all([
      prisma.company.findUnique({
        where: { id },
        select: { low_stock_threshold: true },
      }),
      prisma.product.findMany({
        where: {
          company_id: id,
        },
        orderBy: { id: 'asc' }
      }),
    ]);

    const lowStockThreshold = company?.low_stock_threshold ?? 2;

    const totalProducts = products.reduce((acc, product) => {
      return acc + Number(product.quantity);
    }, 0);

    const totalCost = products.reduce((acc, product) => {
      return acc + Number(product.cost_price) * product.quantity;
    }, 0);

    const lowStock = products.filter(
      (product) => product.quantity > 0 && product.quantity <= lowStockThreshold,
    ).length;

    const outOfStock = products.filter(p => p.quantity === 0).length;

    return {
      products,
      totalProducts,
      totalCost,
      lowStock,
      outOfStock,
      lowStockThreshold,
    };
  }

  async getProfessionals(id, options = {}) {
    const employeeId = Number(options.employeeId || 0) || null;
    const professionals = await prisma.employee.findMany({
      where: {
        company_id: id,
        ...(employeeId ? { id: employeeId } : {}),
      },
      include: {
        services: true,
        scheduleOpenings: true
      },
    });

    return professionals.map(p => ({
      ...p,
      services: p.services.map(s => s.service_id)
    }));
  }

  async getInitialCustomers(id, limit = 50) {
    const page = 1;
    limit = Number(limit);

    const [{ totalCustomers, newCustomers, returningCustomers }, customers] = await Promise.all([
      this.getCustomerSummaryMetrics(id),
      this.getCustomerList(id, page, limit),
    ]);

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      customers
    };
  }

  async getCustomers(id, page = 1, limit = 50) {
    page = Number(page);
    limit = Number(limit);

    const [{ totalCustomers }, customers] = await Promise.all([
      this.getCustomerSummaryMetrics(id),
      this.getCustomerList(id, page, limit),
    ]);

    return {
      page,
      limit,
      total: totalCustomers,
      totalPages: Math.ceil(totalCustomers / limit),
      data: customers,
    };
  }

  async getSettings(id) {
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        photo: true,
        fantasy_name: true,
        email: true,
        phone: true,
        website: true,
        accepted_payment_methods: true,
        amenities: true,
        low_stock_threshold: true,
        evolution_instance_name: true,
        evolution_connection_status: true,
        evolution_connected_phone: true,
        evolution_auto_messages_enabled: true,
      },
    });

    if (!company) return null;

    let currentState = company.evolution_connection_status || "close";
    let currentConnectedPhone = company.evolution_connected_phone || null;
    let currentProfilePictureUrl = null;

    if (company.evolution_instance_name) {
      const overview = await evolutionService.getInstanceConnectionOverview(
        company.evolution_instance_name,
      ).catch(() => null);

      if (overview) {
        currentState = overview.state || currentState;
        currentConnectedPhone = overview.connectedPhone || currentConnectedPhone;
        currentProfilePictureUrl = overview.profilePictureUrl || null;

        await this.syncEvolutionInstanceFields(id, overview).catch(() => null);
      }
    }

    const validation = this.getEvolutionPhoneValidation(
      company.phone,
      currentConnectedPhone,
      currentState === "open",
    );

    return {
      photo: company.photo,
      fantasy_name: company.fantasy_name,
      email: company.email,
      phone: company.phone,
      website: company.website,
      acceptedPaymentMethods: company.accepted_payment_methods,
      amenities: company.amenities,
      lowStockThreshold: company.low_stock_threshold,
      evolution: {
        instanceName: company.evolution_instance_name,
        status: currentState,
        profilePictureUrl: currentProfilePictureUrl,
        autoMessagesEnabled: company.evolution_auto_messages_enabled,
        ...validation,
      },
    };
  }
}
