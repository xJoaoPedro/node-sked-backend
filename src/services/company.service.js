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
        { expiresIn: "1d" },
      ),
      id: company.id
    } 
  }

  async getAllData(id) {
    const dashboard = await this.getDashboard(id)   

    const dailySchedules = await this.getDailySchedules(id)

    const appointments = await this.getAppointments(id)

    const services = await this.getServices(id)

    return {
      dashboard,
      dailySchedules,
      appointments,
      services
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
          start_time: { gte: startOfMonth, lt: endOfMonth },
          status: "CANCELED",
        },
      }),

      prisma.appointment.count({
        where: {
          company_id: id,
          start_time: { gte: startOfMonth, lt: endOfMonth },
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
}
