import "server-only";

import { z } from "zod";

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url().startsWith("mysql://"),
    DATABASE_HOST: z.string().min(1).default("127.0.0.1"),
    DATABASE_PORT: z.coerce.number().int().positive().default(3306),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_NAME: z.string().regex(/^[A-Za-z0-9_]+$/),
    DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: z.stringbool().default(false),
    AUTH_SECRET: z.string().min(32),
    AUTH_SESSION_COOKIE: z.string().min(1).default("osrs_session"),
    CUSTOMER_SESSION_COOKIE: z.string().min(1).default("osrs_customer_session"),
    SESSION_TTL_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .max(24 * 30)
      .default(168),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    PAYMENT_PROVIDER: z
      .enum(["MANUAL_REVIEW", "TEST_HOSTED", "EXTERNAL_HOSTED_CHECKOUT"])
      .default("MANUAL_REVIEW"),
    EXTERNAL_PAYMENTS_ENABLED: z.stringbool().default(false),
    PAYMENT_WEBHOOKS_ENABLED: z.stringbool().default(false),
    PAYMENT_REFUNDS_ENABLED: z.stringbool().default(false),
    TEST_HOSTED_PAYMENT_SECRET: z.string().min(32).optional().or(z.literal("")),
    EMAIL_DELIVERY_ENABLED: z.stringbool().default(false),
    EMAIL_TRANSPORT: z.enum(["SMTP", "TEST_EMAIL"]).default("SMTP"),
    SMTP_HOST: z.string().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USERNAME: z.string().default(""),
    SMTP_PASSWORD: z.string().default(""),
    SMTP_FROM_EMAIL: z.string().email().optional().or(z.literal("")),
    SMTP_FROM_NAME: z.string().min(1).default("OSRS Services"),
    CUSTOM_BUILD_PRIVATE_ATTACHMENT_ROOT: z
      .string()
      .default("storage/private/custom-build-attachments"),
    CHAT_SOCKET_PORT: z.coerce.number().int().positive().default(3001),
    CHAT_SOCKET_PATH: z.string().min(1).startsWith("/").default("/socket.io"),
    CHAT_ALLOWED_ORIGINS: z.string().min(1).default("http://127.0.0.1:3000"),
    CHAT_GUEST_COOKIE: z.string().min(1).default("osrs_chat_guest"),
    NEXT_PUBLIC_CHAT_SOCKET_URL: z.string().url().optional(),
    NEXT_PUBLIC_CHAT_SOCKET_PATH: z
      .string()
      .regex(/^\/(?!.*\.\.).+/)
      .default("/socket.io"),
    ELIGIBILITY_HMAC_SECRET: z.string().min(32).optional(),
    RSN_PROVIDER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(15_000)
      .default(4_000),
    RSN_CACHE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(30)
      .max(3_600)
      .default(300),
    RSN_NEGATIVE_CACHE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(10)
      .max(600)
      .default(60),
    RSN_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(10)
      .max(3_600)
      .default(60),
    RSN_RATE_LIMIT_COUNT: z.coerce.number().int().min(1).max(100).default(8),
    RSN_TRUST_PROXY_IP_HEADER: z.stringbool().default(false),
    RSN_DEVELOPMENT_FIXTURE: z.stringbool().default(false),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && value.RSN_DEVELOPMENT_FIXTURE) {
      context.addIssue({
        code: "custom",
        path: ["RSN_DEVELOPMENT_FIXTURE"],
        message: "RSN_DEVELOPMENT_FIXTURE cannot be enabled in production.",
      });
    }
    if (
      value.CHAT_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .includes("*")
    ) {
      context.addIssue({
        code: "custom",
        path: ["CHAT_ALLOWED_ORIGINS"],
        message: "Credentialed chat CORS cannot use wildcard origins.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.PAYMENT_PROVIDER === "TEST_HOSTED"
    ) {
      context.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message: "TEST_HOSTED payments cannot be selected in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.EXTERNAL_PAYMENTS_ENABLED &&
      value.PAYMENT_PROVIDER === "TEST_HOSTED"
    ) {
      context.addIssue({
        code: "custom",
        path: ["EXTERNAL_PAYMENTS_ENABLED"],
        message: "TEST_HOSTED payments cannot be enabled in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.EMAIL_DELIVERY_ENABLED &&
      value.EMAIL_TRANSPORT === "TEST_EMAIL"
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_TRANSPORT"],
        message: "TEST_EMAIL transport cannot be enabled in production.",
      });
    }
    if (value.EMAIL_DELIVERY_ENABLED && value.EMAIL_TRANSPORT === "SMTP") {
      if (!value.SMTP_HOST) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message: "SMTP_HOST is required when email delivery is enabled.",
        });
      }
      if (!value.SMTP_FROM_EMAIL) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_FROM_EMAIL"],
          message:
            "SMTP_FROM_EMAIL is required when email delivery is enabled.",
        });
      }
    }
  });

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(parsed.error)}`,
  );
}

export const env = {
  ...parsed.data,
  ELIGIBILITY_HMAC_SECRET:
    parsed.data.ELIGIBILITY_HMAC_SECRET ?? parsed.data.AUTH_SECRET,
};
