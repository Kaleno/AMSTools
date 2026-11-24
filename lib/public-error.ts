import { Prisma } from "@prisma/client";
import { LOGIN_RATE_LIMIT_MESSAGE } from "@/lib/login-guard";

export const GENERIC_ERROR_MESSAGE = "Terjadi kesalahan. Coba lagi.";
export const NOT_FOUND_MESSAGE = "Data tidak ditemukan.";
export const FORBIDDEN_MESSAGE = "Anda tidak punya izin untuk melakukan ini.";
export const UNIQUE_FALLBACK_MESSAGE = "Data ini sudah dipakai.";

const SURAT_JALAN_TAKEN = "Nomor Surat Jalan sudah dipakai.";
const INVOICE_TAKEN = "Nomor invoice sudah dipakai.";
const PRODUCT_CODE_TAKEN = "Kode produk sudah dipakai.";
const EMAIL_TAKEN = "Email sudah terpakai.";

/** A message we wrote for the user. Anything else is hidden. */
export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

export class RateLimitError extends Error {
  readonly code = "RATE_LIMIT";
  constructor(message = LOGIN_RATE_LIMIT_MESSAGE) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = FORBIDDEN_MESSAGE) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type ClientErrorKind = "validation" | "unique" | "not_found" | "forbidden" | "rate_limit" | "generic";

export type ClientError = {
  kind: ClientErrorKind;
  message: string;
  log: boolean;
};

type MapOptions = {
  fallback?: string;
  uniqueMessage?: string;
  notFoundMessage?: string;
  forbiddenMessage?: string;
  rateLimitMessage?: string;
};

export function isNextControlFlow(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error;
}

export function uniqueConstraintMessage(target: unknown): string {
  const text = Array.isArray(target) ? target.join(" ") : typeof target === "string" ? target : "";
  if (text.includes("noSuratJalan")) return SURAT_JALAN_TAKEN;
  if (text.includes("noInvoice")) return INVOICE_TAKEN;
  if (text.includes("kodeProduk")) return PRODUCT_CODE_TAKEN;
  if (text.toLowerCase().includes("email")) return EMAIL_TAKEN;
  return UNIQUE_FALLBACK_MESSAGE;
}

function isPrismaKnown(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function isPrismaFailure(error: unknown): boolean {
  return (
    isPrismaKnown(error) ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientValidationError
  );
}

function isForbidden(error: unknown): boolean {
  if (error instanceof ForbiddenError) return true;
  if (!(error instanceof Error)) return false;
  return error.message === "FORBIDDEN_TENANT" || error.message === "MISSING_TENANT";
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === "INVALID_PATH" || error.message === "Not found";
}

/** Turn a thrown value into a sentence that is safe to send to the browser. */
export function mapClientError(error: unknown, options: MapOptions = {}): ClientError {
  const fallback = options.fallback ?? GENERIC_ERROR_MESSAGE;

  if (error instanceof PublicError) {
    return { kind: "validation", message: error.message, log: false };
  }
  if (error instanceof RateLimitError) {
    return { kind: "rate_limit", message: options.rateLimitMessage ?? error.message, log: false };
  }
  if (isForbidden(error)) {
    return { kind: "forbidden", message: options.forbiddenMessage ?? FORBIDDEN_MESSAGE, log: false };
  }
  if (isPrismaKnown(error) && error.code === "P2002") {
    return {
      kind: "unique",
      message: options.uniqueMessage ?? uniqueConstraintMessage(error.meta?.target),
      log: false,
    };
  }
  if (isPrismaKnown(error) && error.code === "P2025") {
    return { kind: "not_found", message: options.notFoundMessage ?? NOT_FOUND_MESSAGE, log: false };
  }
  if (isNotFound(error)) {
    return { kind: "not_found", message: options.notFoundMessage ?? NOT_FOUND_MESSAGE, log: false };
  }
  if (isPrismaFailure(error) || error instanceof Error || error != null) {
    return { kind: "generic", message: fallback, log: true };
  }
  return { kind: "generic", message: fallback, log: true };
}

const SECRET_ASSIGNMENT = /(password|passwd|secret|token|authorization|cookie)\s*[:=]\s*\S+/gi;
const BCRYPT_HASH = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g;
const DB_URL = /(mysql|postgres|postgresql|mongodb|redis):\/\/\S+/gi;

export function redactSecrets(message: string): string {
  return message.replace(SECRET_ASSIGNMENT, "$1=[redacted]").replace(BCRYPT_HASH, "[redacted-hash]").replace(DB_URL, "$1://[redacted]");
}

export function safeErrorDetail(error: unknown): { name: string; code?: string; message: string } {
  if (isPrismaKnown(error)) {
    return { name: error.name, code: error.code, message: redactSecrets(error.message).slice(0, 500) };
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { name: error.name, code: error.errorCode, message: redactSecrets(error.message).slice(0, 500) };
  }
  if (error instanceof Error) {
    return { name: error.name, message: redactSecrets(error.message).slice(0, 500) };
  }
  return { name: "UnknownError", message: "Non-error thrown" };
}

export function logServerError(context: string, error: unknown) {
  console.error(`[${context}]`, safeErrorDetail(error));
}

/** Message for a server action. Redirects and notFound() are thrown again. */
export function actionErrorMessage(error: unknown, context: string, fallback: string, options: MapOptions = {}): string {
  if (isNextControlFlow(error)) throw error;
  const mapped = mapClientError(error, { ...options, fallback });
  if (mapped.log) logServerError(context, error);
  return mapped.message;
}

export function routeFailure(error: unknown, context: string, fallback = GENERIC_ERROR_MESSAGE) {
  if (isNextControlFlow(error)) throw error;
  const mapped = mapClientError(error, { fallback });
  if (mapped.log) logServerError(context, error);
  return { status: routeErrorStatus(mapped.kind), message: mapped.message };
}

export function routeErrorStatus(kind: ClientErrorKind): number {
  if (kind === "not_found") return 404;
  if (kind === "forbidden") return 403;
  if (kind === "rate_limit") return 429;
  if (kind === "validation" || kind === "unique") return 400;
  return 500;
}
