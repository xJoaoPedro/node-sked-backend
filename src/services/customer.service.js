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
  async findOrCreateByCompanyAndPhone(customerData) {
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
      throw new CustomerNotFoundError("Empresa nao encontrada");
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existingCustomer) {
      const relation = await prisma.companyCustomer.findUnique({
        where: {
          company_id_customer_id: {
            company_id: companyId,
            customer_id: existingCustomer.id,
          },
        },
      });

      if (!relation) {
        await prisma.companyCustomer.create({
          data: {
            company_id: companyId,
            customer_id: existingCustomer.id,
          },
        });
      }

      return existingCustomer;
    }

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name,
          phone,
        },
      });

      await tx.companyCustomer.create({
        data: {
          company_id: companyId,
          customer_id: customer.id,
        },
      });

      return customer;
    });
  }

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

  async update(id, customerData) {
    const {
      company_id,
      name,
      phone,
    } = customerData;

    const companyId = company_id ? Number(company_id) : null;

    if (companyId) {
      const companyCustomer = await prisma.companyCustomer.findUnique({
        where: {
          company_id_customer_id: {
            company_id: companyId,
            customer_id: Number(id),
          },
        },
      });

      if (!companyCustomer) {
        throw new CustomerNotFoundError("Cliente nao encontrado para esta empresa");
      }
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCustomer) {
      throw new CustomerNotFoundError("Cliente nao encontrado");
    }

    if (phone && phone !== existingCustomer.phone) {
      const customerWithPhone = await prisma.customer.findUnique({
        where: { phone },
      });

      if (customerWithPhone && customerWithPhone.id !== Number(id)) {
        throw new CustomerConflictError("Ja existe um cliente cadastrado com este telefone");
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    });

    return {
      id: updatedCustomer.id,
      company_id: companyId,
      name: updatedCustomer.name,
      phone: updatedCustomer.phone,
    };
  }
}
