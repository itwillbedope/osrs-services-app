import { describe, expect, it } from "vitest";

import { environmentSchema } from "@/lib/env";
import {
  assertEmailSubjectSafe,
  renderEmailTemplate,
} from "@/lib/email/templates";

describe("email foundation", () => {
  it("escapes HTML variables while preserving plain-text output", () => {
    const rendered = renderEmailTemplate({
      subject: "Order {{orderNumber}} received",
      htmlBody: "<p>Hello {{displayName}}</p>",
      textBody: "Hello {{displayName}}",
      variables: {
        orderNumber: "TASK016",
        displayName: "<Task 016>",
      },
    });
    expect(rendered.subject).toBe("Order TASK016 received");
    expect(rendered.html).toContain("&lt;Task 016&gt;");
    expect(rendered.text).toContain("<Task 016>");
  });

  it("rejects credential-like template variables", () => {
    expect(() =>
      renderEmailTemplate({
        subject: "Reset",
        htmlBody: "{{message}}",
        textBody: "{{message}}",
        variables: {
          message: "My password is hunter2",
        },
      }),
    ).toThrow(/credential-like/);
  });

  it("allows normal password-reset subject wording without header controls", () => {
    expect(assertEmailSubjectSafe("Reset your OSRS Services password")).toBe(
      "Reset your OSRS Services password",
    );
    expect(() =>
      assertEmailSubjectSafe("Hello\r\nBcc: test@example.test"),
    ).toThrow(/header control/);
  });

  it("blocks unsafe production email and payment env combinations", () => {
    const base = {
      DATABASE_URL: "mysql://test:test@127.0.0.1:3306/test",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_USER: "test",
      DATABASE_PASSWORD: "test",
      DATABASE_NAME: "test",
      AUTH_SECRET: "task016-env-secret-at-least-32-characters",
      ELIGIBILITY_HMAC_SECRET:
        "task016-eligibility-secret-at-least-32-characters",
      CHAT_ALLOWED_ORIGINS: "https://example.test",
    };
    expect(
      environmentSchema.safeParse({
        ...base,
        NODE_ENV: "production",
        PAYMENT_PROVIDER: "TEST_HOSTED",
      }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({
        ...base,
        NODE_ENV: "production",
        EMAIL_DELIVERY_ENABLED: "true",
        EMAIL_TRANSPORT: "TEST_EMAIL",
      }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({
        ...base,
        EMAIL_DELIVERY_ENABLED: "true",
        EMAIL_TRANSPORT: "SMTP",
        SMTP_HOST: "",
        SMTP_FROM_EMAIL: "",
      }).success,
    ).toBe(false);
  });
});
