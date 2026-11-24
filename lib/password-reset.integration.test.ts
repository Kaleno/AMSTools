import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { applyPasswordReset } from "./password-reset";
import { passwordPolicyMessage } from "./password-policy";

const enabled = process.env.RUN_DB_TESTS === "1";
const stamp = `reset-${Date.now()}`;

describe(
  "applyPasswordReset database",
  { skip: enabled ? false : "set RUN_DB_TESTS=1 to run against MySQL" },
  () => {
    let tenantA = "";
    let tenantB = "";
    let superAdminId = "";
    let ownerAId = "";
    let ownerBId = "";
    let adminAId = "";
    const weakHash = bcrypt.hashSync("password", 4);

    before(async () => {
      const superAdmin = await prisma.user.create({
        data: {
          name: "Reset Super",
          email: `${stamp}-sa@example.com`,
          passwordHash: weakHash,
          role: "SUPER_ADMIN",
        },
      });
      const companyA = await prisma.tenant.create({
        data: {
          namaPt: `${stamp} A`,
          alamatPt: "Alamat",
          telpPt: "1",
          users: {
            create: [
              {
                name: "Owner A",
                email: `${stamp}-owner-a@example.com`,
                passwordHash: weakHash,
                role: "OWNER",
              },
              {
                name: "Admin A",
                email: `${stamp}-admin-a@example.com`,
                passwordHash: weakHash,
                role: "ADMIN",
              },
            ],
          },
        },
        include: { users: true },
      });
      const companyB = await prisma.tenant.create({
        data: {
          namaPt: `${stamp} B`,
          alamatPt: "Alamat",
          telpPt: "2",
          users: {
            create: {
              name: "Owner B",
              email: `${stamp}-owner-b@example.com`,
              passwordHash: weakHash,
              role: "OWNER",
            },
          },
        },
        include: { users: true },
      });
      superAdminId = superAdmin.id;
      tenantA = companyA.id;
      tenantB = companyB.id;
      ownerAId = companyA.users.find((user) => user.role === "OWNER")!.id;
      adminAId = companyA.users.find((user) => user.role === "ADMIN")!.id;
      ownerBId = companyB.users[0]!.id;
    });

    after(async () => {
      await prisma.user.deleteMany({ where: { email: { contains: stamp } } });
      await prisma.tenant.deleteMany({ where: { namaPt: { startsWith: stamp } } });
      await prisma.$disconnect();
    });

    it("keeps an existing weak password until that account is reset", async () => {
      const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminAId } });
      assert.equal(admin.mustChangePassword, false);
      assert.equal(admin.sessionVersion, 0);
      assert.equal(await bcrypt.compare("password", admin.passwordHash), true);
      assert.notEqual(passwordPolicyMessage("password"), null);
    });

    it("refuses a cross-tenant reset and does not change the target", async () => {
      const beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: adminAId } });
      const result = await applyPasswordReset(
        { id: ownerBId, role: "OWNER", tenantId: tenantB },
        adminAId,
      );
      const afterUser = await prisma.user.findUniqueOrThrow({ where: { id: adminAId } });
      assert.match(result.error ?? "", /luar perusahaan/);
      assert.equal(result.temporaryPassword, undefined);
      assert.equal(afterUser.passwordHash, beforeUser.passwordHash);
      assert.equal(afterUser.sessionVersion, beforeUser.sessionVersion);
    });

    it("refuses an owner resetting another owner and a super admin resetting an admin", async () => {
      const peer = await applyPasswordReset(
        { id: ownerAId, role: "OWNER", tenantId: tenantA },
        ownerBId,
      );
      const downward = await applyPasswordReset(
        { id: superAdminId, role: "SUPER_ADMIN", tenantId: null },
        adminAId,
      );
      assert.match(peer.error ?? "", /luar perusahaan|admin/);
      assert.match(downward.error ?? "", /Owner/);
    });

    it("resets an admin, forces a change, and invalidates the previous session version", async () => {
      const result = await applyPasswordReset(
        { id: ownerAId, role: "OWNER", tenantId: tenantA },
        adminAId,
      );
      assert.equal(result.error, null);
      assert.equal(passwordPolicyMessage(result.temporaryPassword ?? ""), null);
      const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminAId } });
      assert.equal(admin.mustChangePassword, true);
      assert.equal(admin.sessionVersion, 1);
      assert.equal(await bcrypt.compare(result.temporaryPassword ?? "", admin.passwordHash), true);
      assert.equal(await bcrypt.compare("password", admin.passwordHash), false);
    });

    it("lets a super admin reset an owner", async () => {
      const result = await applyPasswordReset(
        { id: superAdminId, role: "SUPER_ADMIN", tenantId: null },
        ownerAId,
      );
      assert.equal(result.error, null);
      const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerAId } });
      assert.equal(owner.mustChangePassword, true);
      assert.equal(owner.sessionVersion, 1);
      assert.equal(await bcrypt.compare(result.temporaryPassword ?? "", owner.passwordHash), true);
    });
  },
);
