# SMTP Launch

Email delivery remains disabled until SMTP is configured, verified and approved.

Required environment variables:

```env
EMAIL_DELIVERY_ENABLED=false
EMAIL_TRANSPORT=SMTP
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=<private-username>
SMTP_PASSWORD=<private-password>
SMTP_FROM_EMAIL=support@example.com
SMTP_FROM_NAME=OSRS Services
```

Never commit SMTP credentials.

## Activation Flow

1. Configure credentials privately on the staging server.
2. Keep `EMAIL_DELIVERY_ENABLED=false`.
3. Run `pnpm production:check`.
4. Verify sender/domain DNS with the mail provider: SPF, DKIM, DMARC and any provider TXT/CNAME verification records.
5. Review templates in `/admin/checkout/email`.
6. Enable email on staging only.
7. Send one safe test email to an approved internal address.
8. Test verification email.
9. Test password recovery email.
10. Test order confirmation email using staging order data only.
11. Review delivery rows and logs for secrets or raw tokens.
12. Repeat in production only after client approval.

## Pass Criteria

- SMTP connection succeeds.
- Sender identity is verified.
- Emails do not expose raw verification/reset tokens in logs.
- Failed delivery produces safe operational output.

## Fail Criteria

- Credentials are stored in GitHub or shared notes.
- `EMAIL_TRANSPORT=TEST_EMAIL` is enabled in production.
- SPF/DKIM/DMARC are missing or broken.
- Password recovery or verification links are malformed.
