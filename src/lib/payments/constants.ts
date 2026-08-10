export const EXTERNAL_PAYMENTS_FEATURE_FLAG = "external_payments_enabled";
export const PAYMENT_WEBHOOKS_FEATURE_FLAG = "payment_webhooks_enabled";
export const PAYMENT_REFUNDS_FEATURE_FLAG = "payment_refunds_enabled";

export const paymentPermissions = {
  view: "payments.view",
  review: "payments.review",
  refund: "payments.refund",
  configure: "payments.configure",
  eligibilityManage: "payments.eligibility.manage",
} as const;

export const paymentProviderLabels = {
  MANUAL_REVIEW: "Manual review",
  TEST_HOSTED: "TEST_HOSTED",
  EXTERNAL_HOSTED_CHECKOUT: "External hosted checkout",
} as const;

export const paymentTransactionStatusLabels = {
  CREATED: "Created",
  PENDING: "Pending",
  REQUIRES_CUSTOMER_ACTION: "Requires customer action",
  AUTHORIZED: "Authorized",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
} as const;

export const paymentEligibilityModeLabels = {
  MANUAL_ONLY: "Manual only",
  PROVIDER_ALLOWED: "Provider allowed",
  PROVIDER_REVIEW_REQUIRED: "Needs client review",
  DISABLED: "Disabled",
} as const;

export const refundStatusLabels = {
  REQUESTED: "Requested",
  PENDING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
} as const;

export const task016PaymentTemplateVersion = "task016-v1";
