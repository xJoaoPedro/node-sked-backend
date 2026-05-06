import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import socketServer from "../socket.js";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const socket = socketServer;

export class AppointmentConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "AppointmentConflictError";
  }
}

export class AppointmentService {
  validateTimeRange(start_time, end_time) {
    if (start_time >= end_time) {
      throw new Error("Horário de término deve ser maior que o horário de início");
    }
  }

  async hasEmployeeOverlap({ employee_id, start_time, end_time, excludeId }) {
    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        employee_id: Number(employee_id),
        status: { not: "CANCELED" },
        ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
        start_time: { lt: end_time },
        end_time: { gt: start_time },
      },
      select: { id: true },
    });

    return Boolean(overlappingAppointment);
  }

  async findAll() {
    return await prisma.appointment.findMany();
  }

  async findOne(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    return appointment ?? null;
  }

  async getAppointmentsByDate(id, date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        company_id: id,
        start_time: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { start_time: "asc" },
      include: {
        service: true,
        client: true,
      },
    });

    return appointments;
  }

  async create(appointment) {
    const {
      company_id,
      service_id,
      employee_id,
      client_id,
      start_time,
      end_time,
      observations,
      status
    } = appointment;

    this.validateTimeRange(start_time, end_time);

    const hasOverlap = await this.hasEmployeeOverlap({
      employee_id,
      start_time,
      end_time,
    });

    if (hasOverlap) {
      throw new AppointmentConflictError(
        "Já existe um agendamento para este funcionário no horário informado",
      );
    }

    await prisma.appointment.create({
      data: {
        company_id: Number(company_id),
        service_id: Number(service_id),
        employee_id: Number(employee_id),
        client_id: Number(client_id),
        start_time,
        end_time,
        observations,
        status
      },
    });
    
    socket.getIO().emit("new_appointment", appointment);

    return;
  }

  async update(id, data) {
    try {
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!currentAppointment) return false;

      const nextAppointment = {
        ...currentAppointment,
        ...data,
      };

      this.validateTimeRange(nextAppointment.start_time, nextAppointment.end_time);

      const hasOverlap = await this.hasEmployeeOverlap({
        employee_id: nextAppointment.employee_id,
        start_time: nextAppointment.start_time,
        end_time: nextAppointment.end_time,
        excludeId: id,
      });

      if (hasOverlap) {
        throw new AppointmentConflictError(
          "Já existe um agendamento para este funcionário no horário informado",
        );
      }

      await prisma.appointment.update({
        where: { id },
        data,
      });

      return true;
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        throw error;
      }

      return false;
    }
  }

  async delete(id) {
    try {
      await prisma.appointment.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
