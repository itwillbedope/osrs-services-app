type SmokeTarget = {
  path: string;
  label: string;
  critical: boolean;
  okStatus?: (status: number) => boolean;
};

type SmokeResult = {
  target: SmokeTarget;
  url: string;
  status?: number;
  elapsedMs: number;
  ok: boolean;
  error?: string;
};

const timeoutMs = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS ?? 10_000);

const targets: SmokeTarget[] = [
  { path: "/", label: "home", critical: true },
  { path: "/health", label: "health", critical: true },
  { path: "/ready", label: "readiness", critical: true },
  { path: "/products", label: "products", critical: true },
  { path: "/accounts", label: "accounts", critical: true },
  {
    path: "/custom-account-build",
    label: "custom account build",
    critical: true,
  },
  { path: "/cart", label: "cart", critical: true },
  { path: "/checkout", label: "checkout", critical: true },
  { path: "/account/login", label: "customer login", critical: true },
  { path: "/account/register", label: "customer registration", critical: true },
  { path: "/support", label: "support and chat", critical: true },
  {
    path: "/support/chat",
    label: "requested support chat path",
    critical: false,
  },
  { path: "/login", label: "staff login", critical: true },
];

function parseBaseUrl() {
  const args = process.argv.slice(2);
  let baseUrl =
    process.env.PRODUCTION_SMOKE_BASE_URL ||
    process.env.SMOKE_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === "--base-url") {
      baseUrl = args[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length);
    } else if (!arg.startsWith("--") && !baseUrl) {
      baseUrl = arg;
    }
  }

  if (!baseUrl) {
    throw new Error(
      "Provide --base-url, PRODUCTION_SMOKE_BASE_URL, SMOKE_BASE_URL or NEXT_PUBLIC_APP_URL.",
    );
  }

  const parsed = new URL(baseUrl);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function endpointUrl(baseUrl: URL, path: string) {
  const url = new URL(baseUrl.toString());
  url.pathname = `${baseUrl.pathname}${path}`.replace(/\/{2,}/g, "/");
  return url.toString();
}

function defaultOkStatus(status: number) {
  return status >= 200 && status < 400;
}

async function checkTarget(
  baseUrl: URL,
  target: SmokeTarget,
): Promise<SmokeResult> {
  const url = endpointUrl(baseUrl, target.path);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "osrs-production-smoke/1.0",
      },
    });
    const elapsedMs = Date.now() - started;
    const ok = (target.okStatus ?? defaultOkStatus)(response.status);
    return { target, url, status: response.status, elapsedMs, ok };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "unknown error";
    return { target, url, elapsedMs, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function printResult(result: SmokeResult) {
  const status = result.status ? String(result.status) : "ERR";
  const prefix = result.ok ? "OK" : result.target.critical ? "FAIL" : "WARN";
  const detail = result.error ? ` - ${result.error}` : "";
  console.log(
    `${prefix} ${status} ${result.target.path} (${result.target.label}, ${result.elapsedMs}ms)${detail}`,
  );
}

async function main() {
  const baseUrl = parseBaseUrl();
  console.log(`Production smoke test target: ${baseUrl.toString()}`);
  console.log(`Request timeout: ${timeoutMs}ms`);

  const results: SmokeResult[] = [];
  for (const target of targets) {
    const result = await checkTarget(baseUrl, target);
    results.push(result);
    printResult(result);
  }

  const criticalFailures = results.filter(
    (result) => result.target.critical && !result.ok,
  );
  const warnings = results.filter(
    (result) => !result.target.critical && !result.ok,
  );

  console.log(
    `Smoke summary: ${results.length - criticalFailures.length - warnings.length}/${results.length} OK, ${criticalFailures.length} critical failure(s), ${warnings.length} warning(s).`,
  );

  if (criticalFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
