import "server-only";

import net from "node:net";
import tls from "node:tls";

import { env } from "@/lib/env";
import { assertEmailSubjectSafe } from "@/lib/email/templates";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailTransportResult = {
  sent: boolean;
  externalMessageId: string | null;
  failureCode: string | null;
  externalCallCount: number;
};

export function emailDeliveryEnabled() {
  return env.EMAIL_DELIVERY_ENABLED;
}

export function emailTransportConfiguration() {
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_FROM_EMAIL);
  return {
    enabled: env.EMAIL_DELIVERY_ENABLED,
    transport: env.EMAIL_TRANSPORT,
    smtpConfigured,
    fromEmail: env.SMTP_FROM_EMAIL || "",
    fromName: env.SMTP_FROM_NAME,
  };
}

function encodeHeader(value: string) {
  return value.replace(/[\r\n]/g, " ").slice(0, 240);
}

function smtpEnvelope(message: EmailMessage) {
  const subject = assertEmailSubjectSafe(message.subject);
  const fromName = encodeHeader(env.SMTP_FROM_NAME);
  const fromEmail = encodeHeader(env.SMTP_FROM_EMAIL || "");
  const to = encodeHeader(message.to);
  const boundary = `osrs-${Date.now().toString(16)}`;
  return [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function readLine(socket: net.Socket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (/\r?\n/.test(buffer)) {
        socket.off("data", onData);
        socket.off("error", reject);
        resolve(buffer);
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
}

async function command(socket: net.Socket, line: string) {
  socket.write(`${line}\r\n`);
  return readLine(socket);
}

async function sendSmtpMessage(
  message: EmailMessage,
): Promise<EmailTransportResult> {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL) {
    return {
      sent: false,
      externalMessageId: null,
      failureCode: "SMTP_NOT_CONFIGURED",
      externalCallCount: 0,
    };
  }
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const created = env.SMTP_SECURE
      ? tls.connect({ port: env.SMTP_PORT, host: env.SMTP_HOST }, () =>
          resolve(created),
        )
      : net.connect(env.SMTP_PORT, env.SMTP_HOST, () => resolve(created));
    created.setTimeout(15_000, () => {
      created.destroy(new Error("SMTP_TIMEOUT"));
    });
    created.once("error", reject);
  });
  try {
    await readLine(socket);
    await command(socket, "EHLO osrs-services.local");
    if (env.SMTP_USERNAME && env.SMTP_PASSWORD) {
      await command(socket, "AUTH LOGIN");
      await command(socket, Buffer.from(env.SMTP_USERNAME).toString("base64"));
      await command(socket, Buffer.from(env.SMTP_PASSWORD).toString("base64"));
    }
    await command(socket, `MAIL FROM:<${env.SMTP_FROM_EMAIL}>`);
    await command(socket, `RCPT TO:<${message.to}>`);
    await command(socket, "DATA");
    socket.write(`${smtpEnvelope(message)}\r\n.\r\n`);
    await readLine(socket);
    await command(socket, "QUIT");
    return {
      sent: true,
      externalMessageId: `smtp-${Date.now().toString(16)}`,
      failureCode: null,
      externalCallCount: 1,
    };
  } catch (error) {
    return {
      sent: false,
      externalMessageId: null,
      failureCode:
        error instanceof Error ? error.message.slice(0, 120) : "SMTP_FAILED",
      externalCallCount: 1,
    };
  } finally {
    socket.destroy();
  }
}

export async function sendEmailMessage(
  message: EmailMessage,
): Promise<EmailTransportResult> {
  const config = emailTransportConfiguration();
  if (!config.enabled) {
    return {
      sent: false,
      externalMessageId: null,
      failureCode: "EMAIL_DISABLED",
      externalCallCount: 0,
    };
  }
  if (config.transport === "TEST_EMAIL") {
    if (env.NODE_ENV === "production") {
      return {
        sent: false,
        externalMessageId: null,
        failureCode: "TEST_EMAIL_PRODUCTION_BLOCKED",
        externalCallCount: 0,
      };
    }
    return {
      sent: true,
      externalMessageId: `test-email-${Date.now().toString(16)}`,
      failureCode: null,
      externalCallCount: 0,
    };
  }
  return sendSmtpMessage(message);
}
