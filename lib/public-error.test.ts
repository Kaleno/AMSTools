import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { LOGIN_RATE_LIMIT_MESSAGE } from "./login-guard";
import {
  FORBIDDEN_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  PublicError,
  RateLimitError,
  actionErrorMessage,
  mapClientError,
  redactSecrets,
  safeErrorDetail,
  uniqueConstraintMessage,
} from "./public-error";

test("known validation and unique messages stay exactly as written", () => {
  assert.equal(mapClientError(new PublicError("Nomor Surat Jalan sudah dipakai.")).message, "Nomor Surat Jalan sudah dipakai.");
  assert.equal(mapClientError(new PublicError("Produk tidak valid.")).message, "Produk tidak valid.");
  assert.equal(uniqueConstraintMessage(["tenantId", "noSuratJalan"]), "Nomor Surat Jalan sudah dipakai.");
  assert.equal(uniqueConstraintMessage("Invoice_tenantId_noInvoice_key"), "Nomor invoice sudah dipakai.");
  assert.equal(uniqueConstraintMessage(["kodeProduk"]), "Kode produk sudah dipakai.");
  assert.equal(uniqueConstraintMessage("User_email_key"), "Email sudah terpakai.");

  const taken = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the constraint: `SuratJalan_tenantId_noSuratJalan_key`", {
    code: "P2002",
    clientVersion: "5.22.0",
    meta: { target: ["tenantId", "noSuratJalan"] },
  });
  assert.deepEqual(mapClientError(taken), {
    kind: "unique",
    message: "Nomor Surat Jalan sudah dipakai.",
    log: false,
  });
  assert.equal(
    mapClientError(taken, { uniqueMessage: "Ada kode yang bentrok. Unggah ulang file." }).message,
    "Ada kode yang bentrok. Unggah ulang file.",
  );
});

test("not found, forbidden, and rate limit become Indonesian sentences", () => {
  const missing = new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "5.22.0",
  });
  assert.equal(mapClientError(missing).message, NOT_FOUND_MESSAGE);
  assert.equal(mapClientError(new Error("INVALID_PATH")).message, NOT_FOUND_MESSAGE);
  assert.equal(mapClientError(new Error("FORBIDDEN_TENANT")).message, FORBIDDEN_MESSAGE);
  assert.equal(mapClientError(new Error("MISSING_TENANT")).message, FORBIDDEN_MESSAGE);
  assert.equal(mapClientError(new RateLimitError()).message, LOGIN_RATE_LIMIT_MESSAGE);
  assert.equal(mapClientError(new RateLimitError()).log, false);
});

test("database and stack text is replaced and the real error is logged without secrets", () => {
  const leaked = new Prisma.PrismaClientValidationError(
    "Invalid `prisma.user.create()` invocation password=hunter2 mysql://root:secret@localhost:3306/amstools\n    at PrismaClient (/app/node_modules/@prisma/client)",
    { clientVersion: "5.22.0" },
  );
  const logs: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const message = actionErrorMessage(leaked, "admin.create", "Gagal menyimpan admin.");
    assert.equal(message, "Gagal menyimpan admin.");
    assert.equal(message.includes("hunter2"), false);
    assert.equal(message.includes("prisma"), false);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], "[admin.create]");
    const detail = logs[0][1] as { message: string; name: string };
    assert.equal(detail.name, "PrismaClientValidationError");
    assert.equal(detail.message.includes("hunter2"), false);
    assert.equal(detail.message.includes("secret@"), false);
    assert.match(detail.message, /password=\[redacted\]/);
    assert.match(detail.message, /mysql:\/\/\[redacted\]/);
  } finally {
    console.error = original;
  }

  const hash = "$2a$12$t/iuGmUQ/fIm.WdFXWqOROm9Mi.fSlTtqiqiet7O8CEGgGs2boD6a";
  assert.equal(redactSecrets(`hash=${hash}`).includes(hash), false);
  assert.equal(safeErrorDetail("password=hunter2").message, "Non-error thrown");
  assert.equal(mapClientError(new Error("Can't reach database server at 127.0.0.1")).message, GENERIC_ERROR_MESSAGE);
});

test("a redirect is not turned into a client message", () => {
  const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/invoices" });
  assert.throws(() => actionErrorMessage(redirectError, "invoice.create", "Gagal menyimpan invoice."));
});
