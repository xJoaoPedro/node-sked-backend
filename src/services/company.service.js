import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { PrismaClient } = pkg 
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class CompanyService {
  async findAll() {
    return await prisma.company.findMany();
  }

  async findOne(id) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    return company ?? null;
  }

  async create(company) {
    const {
      legal_name, fantasy_name, cnpj,
      email, password, phone, interval_slot,
      plan, status, approve_date,
    } = company;
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.company.create({
      data: {
        legal_name, fantasy_name, cnpj, email, 
        password: hashedPassword, phone, interval_slot,
        plan, status, approve_date,
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.company.update({
        where: { id },
        data,
      });

      return true;
    } catch (error) {
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
    const { email, password } = credentials;
    
    const company = await prisma.company.findUnique({
      where: { email: email },
    });

    if (!company) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, company.password);

    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    return {
      token: jwt.sign(
        {
          company_id: company.id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      ),
      id: company.id
    } 
  }

  async getAllData(id) {
    const dashboard = await this.getDashboard(id)   

    const dailySchedules = await this.getDailySchedules(id)

    const appointments = await this.getAppointments(id)

    const cancellations = await this.getInitialCancellations(id)

    const revenue = await this.getInitialRevenues(id)

    const services = await this.getServices(id)

    return {
      dashboard,
      dailySchedules,
      appointments,
      cancellations,
      revenue,
      // comissions
      // reports
      // inventory
      services,
      // professionals
      // customers
      // settings
    }
  }

  async getDashboard(id) {
    const now = new Date()

    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const startWeek = new Date(now)
    startWeek.setDate(now.getDate() - 3)
    startWeek.setHours(0, 0, 0, 0)

    const endWeek = new Date(now)
    endWeek.setDate(now.getDate() + 3)
    endWeek.setHours(0, 0, 0, 0)

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
      weekStats,
      topServices,
      appointments,
      revenueLast6MonthsRaw
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startOfDay, lt: endOfDay },
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
            lt: endOfMonth,
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
          AND a.start_time < ${endOfMonth}
          AND a.status = 'COMPLETED'
      `,

      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.price), 0) as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.start_time >= ${startOfLastMonth}
          AND a.start_time < ${endOfLastMonth}
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
          start_time: { gte: startOfLastMonth, lt: endOfLastMonth },
          status: "CANCELED",
        },
      }),

      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startOfLastMonth, lt: endOfLastMonth },
        },
      }),

      prisma.$queryRaw`
        WITH days AS (
          SELECT generate_series(
            ${startWeek}::date,
            ${endWeek}::date,
            interval '1 day'
          )::date as date
        )
        SELECT
          EXTRACT(DOW FROM d.date) as dow,
          d.date,
          COALESCE(COUNT(a.id), 0)::int as appointments
        FROM days d
        LEFT JOIN appointments a
          ON DATE(a.start_time) = d.date
          AND a.company_id = ${id}
        GROUP BY d.date
        ORDER BY d.date
      `,

      prisma.$queryRaw`
        SELECT s.name, COUNT(a.id)::int as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
        GROUP BY s.name
        ORDER BY total DESC
        LIMIT 5
      `,

      prisma.appointment.findMany({
        where: {
          company_id: id,
          start_time: { gte: now },
          status: { in: ['PENDING', 'CONFIRMED', 'CANCELED']},
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

    const nextAppointments = appointments.map((a) => ({
      id: String(a.id),
      clientName: a.client.name,
      service: a.service.name,
      time: a.start_time.toISOString(),
      status: a.status.toLowerCase(),
    }))

    const revenueLastMonths = revenueLast6MonthsRaw.map((item) => ({
      month: item.month,
      total: Number(item.total),
    }))

    return {
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

  async getDailySchedules(id) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        company_id: id,
        start_time: { gte: startOfDay, lte: endOfDay, },
      },
      orderBy: { start_time: "asc" },
      include: {
        service: true,
        client: true,
      },
    });

    const professionals = await prisma.companyUser.findMany({
      where: {
        company_id: id,
      },
      include: {
        user: true,
      },
    });

    return {
      id,
      appointments,
      professionals
    }
  }

  async getAppointments(id, page = 1, limit = 50, filters = {}) {
    let hasFilter = false;

    const where = {
      company_id: id,
    };

    if (filters.id) {
      hasFilter = true;
      
      where.id = {
        equals: Number(filters.id),
      };
    }

    if (filters.date) {
      hasFilter = true;
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
      hasFilter = true;

      where.service = {
        name: filters.service,
      };
    }

    if (filters.client) {
      hasFilter = true;

      where.client = {
        name: {
          contains: filters.client,
          mode: 'insensitive',
        },
      };
    }

    if (filters.status) {
      hasFilter = true;

      where.status = filters.status.toUpperCase();
    }

    page = hasFilter ? 1 : Number(page);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
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
      data: appointments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),

    };
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
    let startDate = null;

    const now = new Date();

    if (time === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (time === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (time === '3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (time === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }


    const where = {
      company_id: id,
      status: "CANCELED",
      ...(startDate && { start_time: { gte: startDate } }),
    };

    const [cancellations, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { id: "asc" },
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
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const getStartDate = (time) => {
      switch (time) {
        case 'week': {
          const d = new Date(now);
          d.setDate(now.getDate() - 7);
          return d;
        }
        case 'month':
          return new Date(now.getFullYear(), now.getMonth(), 1);

        case '3months':
          return new Date(now.getFullYear(), now.getMonth() - 2, 1);

        case '6months':
          return new Date(now.getFullYear(), now.getMonth() - 5, 1);

        case 'year':
          return new Date(now.getFullYear(), 0, 1);

        default:
          return new Date(now.getFullYear(), now.getMonth(), 1);
      }
    };

    const startDate = getStartDate(time);

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
          start_time: { gte: startDate },
        },
      }),

      // 🔹 total agendamentos
      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startDate },
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
      `,

      // 🔹 gráfico (fixo 6 meses)
      prisma.$queryRaw`
        SELECT
          TO_CHAR(a.start_time, 'YYYY-MM') as month,
          COUNT(a.id)::int as total
        FROM appointments a
        WHERE a.company_id = ${id}
          AND a.status = 'CANCELED'
          AND a.start_time >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
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
        GROUP BY s.name
        ORDER BY total DESC
      `,

      // 🔹 por profissional
      prisma.$queryRaw`
        SELECT 
          u.name,
          COUNT(a.id)::int as cancellations,
          (SELECT COUNT(*) FROM appointments a2 WHERE a2.employee_id = a.employee_id AND a2.company_id = ${id} AND a2.start_time >= ${startDate})::int as total
        FROM appointments a
        JOIN users u ON u.id = a.employee_id
        WHERE a.company_id = ${id}
          AND a.status = 'CANCELED'
          AND a.start_time >= ${startDate}
        GROUP BY u.name, a.employee_id
        ORDER BY cancellations DESC
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
        GROUP BY a.cancel_reason
        ORDER BY total DESC
      `,

      // 🔹 recentes
      prisma.appointment.findMany({
        where: {
          company_id: id,
          status: "CANCELED",
          start_time: { gte: startDate },
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

  async getRevenues(id, page = 1, limit = 50, time = 'month') {
    page = Number(page);
    let startDate = null;

    const now = new Date();

    if (time === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (time === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (time === '3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (time === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const where = {
      company_id: id,
      status: { in: ["COMPLETED", "PENDING"] },
      payment_method: { not: null },
      ...(startDate && { start_time: { gte: startDate } }),
    };

    const [payments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { id: "asc" },
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
      data: payments.map((a) => ({
        id: a.id,
        date: a.start_time.toISOString(),
        clientName: a.client.name,
        serviceName: a.service.name,
        professionalName: a.employee.name,
        paymentMethod: a.payment_method,
        value: Number(a.service.price),
        status: a.status,
      }))
    };
  }

  async getInitialRevenues(id, page = 1, limit = 50, time = 'month') {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const getStartDate = (time) => {
      switch (time) {
        case 'week': {
          const d = new Date(now);
          d.setDate(now.getDate() - 7);
          return d;
        }
        case 'month':
          return new Date(now.getFullYear(), now.getMonth(), 1);
        case '3months':
          return new Date(now.getFullYear(), now.getMonth() - 2, 1);
        case '6months':
          return new Date(now.getFullYear(), now.getMonth() - 5, 1);
        case 'year':
          return new Date(now.getFullYear(), 0, 1);
        default:
          return new Date(now.getFullYear(), now.getMonth(), 1);
      }
    };

    const startDate = getStartDate(time);

    const [
      revenueReceivedRaw,
      revenuePendingRaw,
      totalTransactions,
      revenueByMonthRaw,
      revenueByPaymentRaw,
      recentPayments
    ] = await Promise.all([
      // 💰 receita recebida
      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.price), 0) as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status = 'COMPLETED'
          AND a.start_time >= ${startDate}
      `,

      // ⏳ receita pendente
      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.price), 0) as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status IN ('PENDING', 'CONFIRMED')
          AND a.start_time >= ${startDate}
      `,

      // 🔢 nº de transações pagas
      prisma.appointment.count({
        where: {
          company_id: id,
          status: "COMPLETED",
          start_time: { gte: startDate },
        },
      }),

      // 📊 receita últimos 6 meses
      prisma.$queryRaw`
        SELECT
          TO_CHAR(a.start_time, 'YYYY-MM') as month,
          SUM(s.price)::float as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status = 'COMPLETED'
          AND a.start_time >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,

      // 💳 por forma de pagamento
      prisma.$queryRaw`
        SELECT 
          a.payment_method,
          SUM(s.price)::float as total
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.company_id = ${id}
          AND a.status = 'COMPLETED'
          AND a.payment_method IS NOT NULL
          AND a.start_time >= ${startDate}
        GROUP BY a.payment_method
      `,

      // 🔹 recentes
      prisma.appointment.findMany({
        where: {
          company_id: id,
          status: { in: ["COMPLETED", "PENDING"], },
          payment_method: { not: null },
          start_time: { gte: startDate },
        },
        orderBy: { start_time: "desc" },
        include: {
          service: true,
          client: true,
          employee: true,
        },
        take: 50,
      }),
    ]);

    const revenueReceived = Number(revenueReceivedRaw[0]?.total || 0);
    const revenuePending = Number(revenuePendingRaw[0]?.total || 0);

    const avgTicket = totalTransactions > 0
      ? revenueReceived / totalTransactions
      : 0;

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const revenueByMonth = revenueByMonthRaw.map((item) => {
      const [, month] = item.month.split('-');
      return {
        month: monthNames[parseInt(month, 10) - 1],
        total: Number(item.total),
      };
    });

    const revenueByPayment = revenueByPaymentRaw.map((item) => ({
      method: item.payment_method,
      total: Number(item.total),
    }));

    return {
      revenueReceived,
      revenuePending,
      avgTicket,
      totalTransactions,
      revenueByMonth,
      revenueByPayment,
      recentPayments: recentPayments.map((a) => ({
        id: a.id,
        date: a.start_time.toISOString(),
        clientName: a.client.name,
        serviceName: a.service.name,
        professionalName: a.employee.name,
        paymentMethod: a.payment_method,
        value: Number(a.service.price),
        status: a.status,
      }))
    };
  }
}
