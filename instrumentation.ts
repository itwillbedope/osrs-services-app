import type { Instrumentation } from "next";

type ErrorWithDigest = Error & { digest?: string };

const secretRedactions: Array<[RegExp, string]> = [
  [/mysql:\/\/[^@\s]+@/gi, "mysql://[redacted]@"],
  [
    /\b(DATABASE_URL|DATABASE_PASSWORD|AUTH_SECRET|SMTP_PASSWORD|TEST_HOSTED_PAYMENT_SECRET)=([^\s,;]+)/gi,
    "$1=[redacted]",
  ],
  [
    /\b(password|token|secret|signature|authorization)=([^\s,;]+)/gi,
    "$1=[redacted]",
  ],
  [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]"],
] as const;

function redact(value: unknown) {
  if (typeof value !== "string" || !value) return value;

  return secretRedactions
    .reduce(
      (text, [pattern, replacement]) => text.replace(pattern, replacement),
      value,
    )
    .slice(0, 4000);
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const cause = error instanceof Error ? (error as ErrorWithDigest) : null;

  console.error("[runtime:on-request-error]", {
    name: cause?.name ?? "UnknownError",
    message: redact(cause?.message ?? String(error)),
    digest: cause?.digest,
    stack: redact(cause?.stack),
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
