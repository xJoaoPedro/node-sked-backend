import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class CustomerConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "CustomerConflictError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerService {
  async create(customerData) {
    const {
      company_id,
      name,
      phone,
    } = customerData;

    const companyId = Number(company_id);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new CustomerNotFoundError("Empresa não encontrada");
    }

    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {},
        create: {
          name,
          phone,
        },
      });

      const existingCompanyCustomer = await tx.companyCustomer.findUnique({
        where: {
          company_id_customer_id: {
            company_id: companyId,
            customer_id: customer.id,
          },
        },
      });

      if (existingCompanyCustomer) {
        throw new CustomerConflictError("Cliente já cadastrado para esta empresa");
      }

      const createdCompanyCustomer = await tx.companyCustomer.create({
        data: {
          company_id: companyId,
          customer_id: customer.id,
        },
        include: {
          customer: true,
        },
      });

      return {
        id: createdCompanyCustomer.customer.id,
        company_id: createdCompanyCustomer.company_id,
        name: createdCompanyCustomer.customer.name,
        phone: createdCompanyCustomer.customer.phone,
      };
    });
  }
}
