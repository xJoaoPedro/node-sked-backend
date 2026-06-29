export class EmailConflictError extends Error {
  constructor(message = "Este e-mail ja esta sendo usado por outro acesso") {
    super(message);
    this.name = "EmailConflictError";
  }
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export async function assertEmailAvailable(prisma, email, options = {}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return;

  const {
    excludeCompanyId,
    excludeUserId,
    excludeEmployeeId,
  } = options;

  const [company, user, employee] = await Promise.all([
    prisma.company.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
        ...(excludeCompanyId ? { id: { not: Number(excludeCompanyId) } } : {}),
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
        ...(excludeUserId ? { id: { not: Number(excludeUserId) } } : {}),
      },
      select: { id: true },
    }),
    prisma.employee.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
        ...(excludeEmployeeId ? { id: { not: Number(excludeEmployeeId) } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (company || user || employee) {
    throw new EmailConflictError();
  }
}
