import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import socketServer from "../socket.js";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const socket = socketServer;

export class AppointmentService {
  async findAll() {
    return await prisma.appointment.findMany();
  }

  async findOne(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    return appointment ?? null;
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
      await prisma.appointment.update({
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
      await prisma.appointment.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
