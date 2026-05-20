import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import { timeToDate } from "../utils/parsers/dateParser.js"

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class ScheduleOpeningService {
  async findAll() {
    return await prisma.scheduleOpening.findMany();
  }

  async findOne(id) {
    const scheduleOpening = await prisma.scheduleOpening.findUnique({
      where: { id },
    });

    return scheduleOpening ?? null;
  }

  async create(scheduleOpening) {
    const { company_id, employee_id, week_day, start_time, end_time } = scheduleOpening;

    await prisma.scheduleOpening.create({
      data: {
        company_id: Number(company_id),
        employee_id: Number(employee_id),
        week_day: Number(week_day),
        start_time: timeToDate(start_time),
        end_time: timeToDate(end_time),
      },
    });

    return;
  }

  async update(id, data) {
    data.start_time = timeToDate(data.start_time)
    data.end_time = timeToDate(data.end_time)

    try {
      await prisma.scheduleOpening.update({
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
      await prisma.scheduleOpening.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
