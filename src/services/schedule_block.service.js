import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import { formatDate } from "../utils/dateParser.js"

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class ScheduleBlockService {
  async findAll() {
    return await prisma.scheduleBlock.findMany();
  }

  async findOne(id) {
    const scheduleBlock = await prisma.scheduleBlock.findUnique({
      where: { id },
    });

    return scheduleBlock ?? null;
  }

  async create(scheduleBlock) {
    const { company_id, employee_id, start_time, end_time, reason } = scheduleBlock;

    await prisma.scheduleBlock.create({
      data: {
        company_id: Number(company_id),
        employee_id: Number(employee_id),
        start_time: formatDate(start_time),
        end_time: formatDate(end_time),
        reason
      },
    });

    return;
  }

  async update(id, data) {
    data.start_time = formatDate(data.start_time)
    data.end_time = formatDate(data.end_time)

    try {
      await prisma.scheduleBlock.update({
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
      await prisma.scheduleBlock.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
