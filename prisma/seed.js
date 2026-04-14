import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("123456", 10)

  // Empresa
  const company = await prisma.company.create({
    data: {
      legal_name: "Empresa LTDA",
      fantasy_name: "Empresa Teste",
      cnpj: "12345678000199",
      email: "admin@empresa.com",
      password,
      status: "APPROVED",
    },
  })

  // Funcionários
  const employees = await Promise.all(
    Array.from({ length: 3 }).map((_, i) =>
      prisma.user.create({
        data: {
          name: `Funcionario ${i + 1}`,
          email: `func${i + 1}@empresa.com`,
          password,
          phone: "51999999999",
        },
      })
    )
  )

  // Clientes
  const clients = await Promise.all(
    Array.from({ length: 20 }).map((_, i) =>
      prisma.user.create({
        data: {
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@mail.com`,
          password,
          phone: "51988888888",
        },
      })
    )
  )

  // Relaciona funcionários à empresa
  for (const emp of employees) {
    await prisma.companyUser.create({
      data: {
        company_id: company.id,
        user_id: emp.id,
        role: "EMPLOYEE",
      },
    })
  }

  // Serviços
  const services = await Promise.all([
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Corte de cabelo",
        duration_minutes: 30,
        price: 50,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Barba",
        duration_minutes: 20,
        price: 30,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Corte + Barba",
        duration_minutes: 50,
        price: 70,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Progressiva",
        duration_minutes: 120,
        price: 200,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Hidratação",
        duration_minutes: 60,
        price: 80,
      },
    }),
  ])

  const now = new Date()

  // Gerar agendamentos (últimos 6 meses + futuros)
  const appointments = []

  for (let i = 0; i < 200; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 180) // últimos 6 meses
    const date = new Date()
    date.setDate(date.getDate() - randomDaysAgo)

    const service = services[Math.floor(Math.random() * services.length)]
    const employee = employees[Math.floor(Math.random() * employees.length)]
    const client = clients[Math.floor(Math.random() * clients.length)]

    const start = new Date(date)
    start.setHours(9 + Math.floor(Math.random() * 8))

    const end = new Date(start)
    end.setMinutes(end.getMinutes() + service.duration_minutes)

    const statuses = ["COMPLETED", "CANCELED", "CONFIRMED"]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    appointments.push({
      company_id: company.id,
      service_id: service.id,
      employee_id: employee.id,
      client_id: client.id,
      start_time: start,
      end_time: end,
      status,
    })
  }

  // Próximos agendamentos (pra dashboard)
  for (let i = 1; i <= 5; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)

    const service = services[0]
    const employee = employees[0]
    const client = clients[i]

    const start = new Date(date)
    start.setHours(10)

    const end = new Date(start)
    end.setMinutes(end.getMinutes() + service.duration_minutes)

    appointments.push({
      company_id: company.id,
      service_id: service.id,
      employee_id: employee.id,
      client_id: client.id,
      start_time: start,
      end_time: end,
      status: "CONFIRMED",
    })
  }

  await prisma.appointment.createMany({
    data: appointments,
  })

  console.log("🌱 Seed finalizado!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())