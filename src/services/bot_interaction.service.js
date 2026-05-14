import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class BotInteractionService {
  async findByMessageId(messageId) {
    if (!messageId) return null;

    return prisma.botInteraction.findFirst({
      where: {
        data: {
          path: ["messageId"],
          equals: messageId,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  async findLatestConversation(companyId, clientId) {
    return prisma.botInteraction.findFirst({
      where: {
        company_id: Number(companyId),
        client_id: Number(clientId),
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  async findAll() {
    return await prisma.botInteraction.findMany();
  }

  async findOne(id) {
    const botInteraction = await prisma.botInteraction.findUnique({
      where: { id },
    });

    return botInteraction ?? null;
  }

  async create(botInteraction) {
    const {
      company_id,
      client_id,
      type,
      status,
      data
    } = botInteraction;

    await prisma.botInteraction.create({
      data: {
        company_id: Number(company_id),
        client_id: Number(client_id),
        type,
        status,
        data
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.botInteraction.update({
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
      await prisma.botInteraction.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
