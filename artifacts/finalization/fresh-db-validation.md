# Fresh DB Validation

Fresh validation path:

1. pnpm db:generate
2. pnpm db:migrate
3. pnpm db:seed
4. pnpm db:seed
5. pnpm pricing:reference-check

The GitHub Actions finalization workflow runs this sequence against MySQL 8.4.
