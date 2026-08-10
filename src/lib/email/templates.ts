export type EmailTemplateVariables = Record<
  string,
  string | number | null | undefined
>;

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

const unsafeEmailValuePattern =
  /(password|bank\s*pin|authenticator|recovery\s*answer|session\s*token|card\s*number|cvv|cvc|private\s*key|seed\s*phrase)/i;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeVariable(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value).slice(0, 500);
  if (unsafeEmailValuePattern.test(text)) {
    throw new Error("Email templates cannot render credential-like content.");
  }
  return text;
}

function interpolate(
  template: string,
  variables: EmailTemplateVariables,
  escape: boolean,
) {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = normalizeVariable(variables[key]);
    return escape ? escapeHtml(value) : value;
  });
}

export function renderEmailTemplate(input: {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: EmailTemplateVariables;
}): RenderedEmailTemplate {
  return {
    subject: interpolate(input.subject, input.variables, false).slice(0, 240),
    html: interpolate(input.htmlBody, input.variables, true),
    text: interpolate(input.textBody, input.variables, false),
  };
}

export function assertEmailSubjectSafe(subject: string) {
  if (/[\r\n]/.test(subject)) {
    throw new Error("Email subject cannot contain header control characters.");
  }
  return subject.slice(0, 240);
}
