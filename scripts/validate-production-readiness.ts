import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Check = {
  key: string;
  status: "READY" | "NOT_READY" | "DISABLED" | "NEEDS_CLIENT_REVIEW";
  summary: string;
};

const allowMissing = process.argv.includes("--allow-missing-production-config");

function bool(name: string) {
  return process.env[name] === "true";
}

function has(name: string) {
  return Boolean(process.env[name] && process.env[name]!.trim());
}

function lengthAtLeast(name: string, length: number) {
  return (process.env[name] ?? "").length >= length;
}

function check(
  key: string,
  condition: boolean,
  readySummary: string,
  failureSummary: string,
): Check {
  return {
    key,
    status: condition ? "READY" : "NOT_READY",
    summary: condition ? readySummary : failureSummary,
  };
}

function privateRootOutsidePublic() {
  const root =
    process.env.CUSTOM_BUILD_PRIVATE_ATTACHMENT_ROOT ??
    "storage/private/custom-build-attachments";
  const resolved = path.resolve(process.cwd(), root);
  const publicRoot = path.resolve(process.cwd(), "public");
  return !resolved.startsWith(publicRoot + path.sep) && resolved !== publicRoot;
}

function explicitChatOrigins() {
  const origins = (process.env.CHAT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 && origins.every((origin) => origin !== "*");
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const checks: Check[] = [
  check(
    "NODE_ENV",
    process.env.NODE_ENV === "production" || allowMissing,
    "NODE_ENV is production or local allow-missing mode is active.",
    "NODE_ENV must be production for a real launch check.",
  ),
  check(
    "DATABASE configuration",
    has("DATABASE_URL") || (has("DATABASE_HOST") && has("DATABASE_NAME")),
    "Database configuration is present.",
    "Database configuration is missing.",
  ),
  check(
    "AUTH_SECRET length",
    lengthAtLeast("AUTH_SECRET", 32),
    "AUTH_SECRET length is acceptable.",
    "AUTH_SECRET must be at least 32 characters.",
  ),
  check(
    "ELIGIBILITY_HMAC_SECRET length",
    lengthAtLeast("ELIGIBILITY_HMAC_SECRET", 32),
    "ELIGIBILITY_HMAC_SECRET length is acceptable.",
    "ELIGIBILITY_HMAC_SECRET must be at least 32 characters.",
  ),
  check(
    "HTTPS app URL",
    allowMissing || /^https:\/\/[^/]+/.test(appUrl),
    "Production app URL is HTTPS or local allow-missing mode is active.",
    "NEXT_PUBLIC_APP_URL must be HTTPS in production.",
  ),
  check(
    "Customer session cookie",
    has("CUSTOMER_SESSION_COOKIE"),
    "Customer session cookie name is configured.",
    "CUSTOMER_SESSION_COOKIE is missing.",
  ),
  check(
    "Staff session cookie",
    has("AUTH_SESSION_COOKIE"),
    "Staff session cookie name is configured.",
    "AUTH_SESSION_COOKIE is missing.",
  ),
  check(
    "RSN fixture disabled",
    !bool("RSN_DEVELOPMENT_FIXTURE"),
    "RSN_DEVELOPMENT_FIXTURE is false.",
    "RSN_DEVELOPMENT_FIXTURE must be false.",
  ),
  check(
    "Private attachment root",
    privateRootOutsidePublic(),
    "Private attachment root is outside public assets.",
    "Private attachment root must be outside public/.",
  ),
  check(
    "Chat allowed origins",
    explicitChatOrigins(),
    "Chat allowed origins are explicit.",
    "Credentialed chat CORS cannot use wildcard or empty origins.",
  ),
  check(
    "SMTP if email enabled",
    !bool("EMAIL_DELIVERY_ENABLED") ||
      (has("SMTP_HOST") && has("SMTP_FROM_EMAIL")),
    "SMTP sender configuration is present when email is enabled.",
    "SMTP_HOST and SMTP_FROM_EMAIL are required when email is enabled.",
  ),
  check(
    "Payment provider if external enabled",
    !bool("EXTERNAL_PAYMENTS_ENABLED") ||
      process.env.PAYMENT_PROVIDER === "EXTERNAL_HOSTED_CHECKOUT",
    "Payment provider mode matches external payment activation.",
    "External payments need an approved provider configuration.",
  ),
  check(
    "Webhooks if enabled",
    !bool("PAYMENT_WEBHOOKS_ENABLED") ||
      (bool("EXTERNAL_PAYMENTS_ENABLED") &&
        process.env.PAYMENT_PROVIDER !== "MANUAL_REVIEW"),
    "Webhook activation is consistent with external payments.",
    "Payment webhooks cannot mutate live payments without external payments.",
  ),
  check(
    "Admin seed reset disabled",
    process.env.ADMIN_SEED_RESET_PASSWORD !== "true",
    "ADMIN_SEED_RESET_PASSWORD is not enabled.",
    "ADMIN_SEED_RESET_PASSWORD must be false outside an intentional reset.",
  ),
  check(
    "No development database password",
    process.env.DATABASE_PASSWORD !== "local-development-only",
    "Database password is not the local example value.",
    "Replace local example database credentials for production.",
  ),
  check(
    "No TEST_HOSTED production provider",
    process.env.PAYMENT_PROVIDER !== "TEST_HOSTED",
    "TEST_HOSTED is not selected.",
    "TEST_HOSTED must never be selected for production.",
  ),
  check(
    "No TEST_EMAIL production transport",
    !(
      bool("EMAIL_DELIVERY_ENABLED") &&
      process.env.EMAIL_TRANSPORT === "TEST_EMAIL"
    ),
    "TEST_EMAIL is not active for delivery.",
    "TEST_EMAIL must never be enabled for production delivery.",
  ),
];

if (bool("EXTERNAL_PAYMENTS_ENABLED") && bool("PAYMENT_REFUNDS_ENABLED")) {
  checks.push({
    key: "Refund activation",
    status: "NEEDS_CLIENT_REVIEW",
    summary:
      "Refund activation requires provider approval and operational refund policy review.",
  });
}

const failures = checks.filter((entry) => entry.status === "NOT_READY");
const lines = [
  "Task 016 production readiness check",
  `Generated at: ${new Date().toISOString()}`,
  `Allow missing production config: ${allowMissing}`,
  "",
  ...checks.map((entry) => `${entry.status}: ${entry.key} - ${entry.summary}`),
  "",
  `Blocking NOT_READY checks: ${failures.length}`,
];

const outputDirectory = path.join(process.cwd(), "artifacts", "task-016");

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "task016-production-readiness.txt"),
    `${lines.join("\n")}\n`,
    "utf8",
  );
  console.log(lines.join("\n"));

  if (failures.length && !allowMissing) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
