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
  getTimeZone() {
    return process.env.APP_TIMEZONE || "America/Sao_Paulo";
  }

  formatAppointmentDateTime(dateValue) {
    const date = new Date(dateValue);
    const timeZone = this.getTimeZone();

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

    const formattedTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    return {
      formattedDate,
      formattedTime,
    };
  }

  getAppointmentWeekDay(dateValue) {
    const date = new Date(dateValue);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: this.getTimeZone(),
      weekday: "short",
    }).format(date);

    const weekdayMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return weekdayMap[weekday];
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

  async validateEmployeeScheduleAvailability({
    company_id,
    employee_id,
    start_time,
    end_time,
  }) {
    const weekDay = this.getAppointmentWeekDay(start_time);

    const openings = await prisma.scheduleOpening.findMany({
      where: {
        company_id: Number(company_id),
        employee_id: Number(employee_id),
        week_day: weekDay,
      },
      orderBy: {
        start_time: "asc",
      },
      select: {
        start_time: true,
        end_time: true,
      },
    });

    if (!openings.length) {
      throw new Error("O funcionario nao possui agenda aberta para este dia");
    }

    const appointmentStartMinutes = this.getMinutesInTimeZone(start_time);
    const appointmentEndMinutes = this.getMinutesInTimeZone(end_time);

    const fitsInOpening = openings.some((opening) => {
      const openingStartMinutes = this.getMinutesInTimeZone(opening.start_time);
      const openingEndMinutes = this.getMinutesInTimeZone(opening.end_time);

      return (
        appointmentStartMinutes >= openingStartMinutes &&
        appointmentEndMinutes <= openingEndMinutes
      );
    });

    if (!fitsInOpening) {
      throw new Error("O horario informado esta fora da agenda aberta do funcionario");
    }
  }

  buildRealtimePayload(appointment, eventName) {
    const isCanceled =
      eventName === "appointment:canceled" || appointment.status === "CANCELED";
    const isCreated = eventName === "appointment:created";
    const isUpdated = eventName === "appointment:updated";
    const { formattedDate, formattedTime } = this.formatAppointmentDateTime(
      appointment.start_time,
    );
    const clientName = appointment.client?.name || "Um cliente";
    const serviceName = appointment.service?.name || "um servico";

    let title = "Atualizacao de agendamento";
    let message = `${clientName} teve uma atualizacao no agendamento.`;
    let type = "appointment";

    if (isCreated) {
      title = "Novo agendamento";
      message = `${clientName} agendou ${serviceName} dia ${formattedDate}, ${formattedTime}.`;
    } else if (isUpdated) {
      title = "Agendamento alterado";
      message = `Houve uma alteracao no agendamento nº ${appointment.id}.`;
    } else if (isCanceled) {
      title = "Agendamento cancelado";
      message = `${clientName} cancelou um agendamento.`;
      type = "cancellation";
    } else if (eventName === "appointment:deleted") {
      title = "Agendamento removido";
      message = `O agendamento nº ${appointment.id} foi removido.`;
    }

    return {
      id: appointment.id,
      company_id: appointment.company_id,
      service_id: appointment.service_id,
      employee_id: appointment.employee_id,
      client_id: appointment.client_id,
      client_name: appointment.client?.name,
      service_name: appointment.service?.name,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      status: appointment.status,
      observations: appointment.observations,
      cancel_reason: appointment.cancel_reason,
      created_at: appointment.updated_at ?? appointment.created_at ?? new Date().toISOString(),
      title,
      message,
      type,
    };
  }

  emitAppointmentEvent(eventName, appointment, options = {}) {
    const payload = this.buildRealtimePayload(appointment, eventName);

    socket.emitNotificationToCompany(appointment.company_id, eventName, payload, options);
    socket.emitToCompany(appointment.company_id, "dashboard:updated", {
      company_id: appointment.company_id,
      source: "appointment",
      event: eventName,
      created_at: new Date().toISOString(),
    }, options);
  }

  calculateEndTime(start_time, duration_minutes) {
    const start = new Date(start_time);
    const end = new Date(start);

    end.setMinutes(end.getMinutes() + Number(duration_minutes));

    return end;
  }

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

  async create(appointment, options = {}) {
    const {
      company_id,
      service_id,
      employee_id,
      client_id,
      start_time,
      observations,
      status
    } = appointment;

    const service = await prisma.service.findUnique({
      where: { id: Number(service_id) },
      select: {
        id: true,
        company_id: true,
        duration_minutes: true,
      },
    });

    if (!service) {
      throw new Error("Serviço não encontrado");
    }

    if (service.company_id !== Number(company_id)) {
      throw new Error("Serviço não pertence à empresa informada");
    }

    const appointmentStartTime = new Date(start_time);
    const appointmentEndTime = this.calculateEndTime(
      appointmentStartTime,
      service.duration_minutes,
    );

    this.validateTimeRange(appointmentStartTime, appointmentEndTime);
    await this.validateEmployeeScheduleAvailability({
      company_id,
      employee_id,
      start_time: appointmentStartTime,
      end_time: appointmentEndTime,
    });

    const hasOverlap = await this.hasEmployeeOverlap({
      employee_id,
      start_time: appointmentStartTime,
      end_time: appointmentEndTime,
    });

    if (hasOverlap) {
      throw new AppointmentConflictError(
        "Já existe um agendamento para este funcionário no horário informado",
      );
    }

    const createdAppointment = await prisma.appointment.create({
      data: {
        company_id: Number(company_id),
        service_id: Number(service_id),
        employee_id: Number(employee_id),
        client_id: Number(client_id),
        start_time: appointmentStartTime,
        end_time: appointmentEndTime,
        observations,
        status
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.emitAppointmentEvent("appointment:created", createdAppointment, options);

    return;
  }

  async update(id, data, options = {}) {
    try {
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!currentAppointment) return false;

      const nextServiceId = Number(data.service_id ?? currentAppointment.service_id);
      const service = await prisma.service.findUnique({
        where: { id: nextServiceId },
        select: {
          id: true,
          company_id: true,
          duration_minutes: true,
        },
      });

      if (!service) {
        throw new Error("Serviço não encontrado");
      }

      const companyId = Number(data.company_id ?? currentAppointment.company_id);

      if (service.company_id !== companyId) {
        throw new Error("Serviço não pertence à empresa informada");
      }

      const nextStartTime = data.start_time
        ? new Date(data.start_time)
        : currentAppointment.start_time;
      const nextEndTime = this.calculateEndTime(nextStartTime, service.duration_minutes);

      const nextAppointment = {
        ...currentAppointment,
        ...data,
        company_id: companyId,
        service_id: nextServiceId,
        start_time: nextStartTime,
        end_time: nextEndTime,
      };

      this.validateTimeRange(nextAppointment.start_time, nextAppointment.end_time);
      await this.validateEmployeeScheduleAvailability({
        company_id: nextAppointment.company_id,
        employee_id: nextAppointment.employee_id,
        start_time: nextAppointment.start_time,
        end_time: nextAppointment.end_time,
      });

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

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          ...data,
          company_id: companyId,
          service_id: nextServiceId,
          start_time: nextStartTime,
          end_time: nextEndTime,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const eventName =
        updatedAppointment.status === "CANCELED"
          ? "appointment:canceled"
          : "appointment:updated";

      this.emitAppointmentEvent(eventName, updatedAppointment, options);

      return true;
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        throw error;
      }

      return false;
    }
  }

  async delete(id, options = {}) {
    try {
      const deletedAppointment = await prisma.appointment.delete({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.emitAppointmentEvent("appointment:deleted", deletedAppointment, options);

      return true;
    } catch (error) {
      return false;
    }
  }
}
