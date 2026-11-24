import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EXAMPLE_SEED_PASSWORD, productionSeedPasswordProblem } from "../lib/production-secrets";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@amstools.local").toLowerCase();
  const configuredPassword = process.env.SEED_ADMIN_PASSWORD;
  const seedPasswordProblem = productionSeedPasswordProblem(configuredPassword);
  if (seedPasswordProblem) {
    throw new Error(seedPasswordProblem);
  }
  const password = configuredPassword || EXAMPLE_SEED_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      tenantId: null,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
      canViewDashboard: true,
      canManageInvoice: true,
      canManageSuratJalan: true,
      canManageMasterData: true,
      canViewReports: true,
    },
    create: {
      name: "Super Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      canViewDashboard: true,
      canManageInvoice: true,
      canManageSuratJalan: true,
      canManageMasterData: true,
      canViewReports: true,
    },
  });

  console.log(`Seeded SUPER_ADMIN: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
