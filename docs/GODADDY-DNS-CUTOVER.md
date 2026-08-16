# GoDaddy DNS Cutover

The domain stays registered at GoDaddy.

Use staging first:

```text
staging.osrsservices.com
```

Only after staging and client approval should production A/CNAME records point to the production server.

## Pre-Cutover

- Export or screenshot the current GoDaddy DNS zone.
- Record current A, CNAME, MX, TXT and SRV records.
- Preserve existing MX records.
- Preserve SPF records.
- Preserve DKIM records.
- Preserve DMARC records.
- Preserve TXT verification records for email, analytics, search console or other services.
- Lower TTL ahead of the approved cutover window if appropriate.
- Confirm the previous site can remain available for rollback.

Do not delete email DNS records blindly.

## Staging Record

Use placeholders until the actual IP is approved:

```text
Type: A
Name: staging
Value: <staging-server-ip>
TTL: <approved-ttl>
```

## Production Records

After approval:

```text
Type: A
Name: @
Value: <production-server-ip>
TTL: <approved-ttl>
```

For `www`, choose the approved approach:

```text
Type: CNAME
Name: www
Value: osrsservices.com
TTL: <approved-ttl>
```

or:

```text
Type: A
Name: www
Value: <production-server-ip>
TTL: <approved-ttl>
```

## SSL Verification

- Obtain or renew certificates for the exact hostnames.
- Verify HTTP challenge or DNS challenge as required.
- Run `sudo nginx -t`.
- Reload Nginx.
- Confirm HTTPS for apex and `www`.

## Post-Cutover Checks

```bash
curl -I https://osrsservices.com
curl -fsS https://osrsservices.com/health
curl -fsS https://osrsservices.com/ready
pnpm production:smoke -- --base-url https://osrsservices.com
```

## Rollback

Restore the previous A/CNAME values from the pre-cutover record backup. Keep previous MX, SPF, DKIM, DMARC and TXT verification records intact. DNS rollback is limited by TTL and resolver cache, so keep the previous host available through the rollback window.
