# Placeholder Scan

Static scan pattern: placeholder, TODO, FIXME, demo, representative, lorem, coming soon.

Findings are limited to historical task fixtures, compatibility scripts, report wording, or explicit external-input notes. Launch-facing footer placeholder links were removed.

```
prisma\product-seed.ts:  "Browse representative item, bond and outfit listings after staff review. Product marketplace data is disabled by default until prices, stock and fulfilment wording are approved.";
prisma\product-seed.ts:    stableKey: "product-osrs-bond-demo",
prisma\product-seed.ts:    publicTitle: "Bond marketplace demo",
prisma\product-seed.ts:    slug: "bond-marketplace-demo",
prisma\product-seed.ts:      "Paused representative bond listing with tiered pricing and zero seeded stock.",
prisma\product-seed.ts:      "This representative bond listing demonstrates Task 012 quantity-tier pricing and stock checks. It is seeded for review only, is not affiliated with Jagex, and does not create a cart, order, payment or stock hold.",
prisma\product-seed.ts:    stableKey: "product-rune-essence-demo",
prisma\product-seed.ts:    publicTitle: "Rune essence stack demo",
prisma\product-seed.ts:    slug: "rune-essence-stack-demo",
prisma\product-seed.ts:      "Draft representative item listing with fixed unit pricing and tracked stock.",
prisma\product-seed.ts:    stableKey: "product-graceful-outfit-demo",
prisma\product-seed.ts:      "This draft outfit package demonstrates the fixed-package mode. Fulfilment details, eligibility and stock must be reviewed by staff before publication.",
prisma\product-seed.ts:    stableKey: "product-manual-review-demo",
prisma\product-seed.ts:      caption: "Safe demo artwork, not game artwork or customer data.",
prisma\product-seed.ts:      altText: `${productTitle} safe gallery placeholder`,
prisma\product-seed.ts:      caption: "Deterministic placeholder for review and CI screenshots.",
scripts\capture-task-009.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-009.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-008.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-008.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-008.ts:    `UPDATE FeatureFlag SET enabled = 1 WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-011.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-011.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-010.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-010.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-013.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-013.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-013.ts:        ? "Bond marketplace demo x 2 bonds"
scripts\capture-task-013.ts:    title: "Bond marketplace demo",
scripts\capture-task-013.ts:       'STANDARD_SERVICE', ?, 'bond-marketplace-demo', 2, 'USD',
scripts\capture-task-013.ts:       'Bond marketplace demo', 'Bond marketplace demo x 2 bonds', 2, 'USD',
scripts\capture-task-013.ts:       ?, 999, 0, 999, ?, 'bond-marketplace-demo', ?, 'ACTIVE', NOW(3))`,
scripts\capture-task-013.ts:      JSON.stringify([{ label: "Bond marketplace demo", amountCents: 999 }]),
scripts\capture-task-012.ts:  const placeholders = flagKeys.map(() => "?").join(", ");
scripts\capture-task-012.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
scripts\capture-task-012.ts:     WHERE stableKey = 'product-osrs-bond-demo'`,
scripts\capture-task-012.ts:  await page.getByText("Bond marketplace demo").first().waitFor();
scripts\capture-task-012.ts:  await page.goto(`${baseUrl}/products/bond-marketplace-demo`);
scripts\capture-task-012.ts:  await page.getByRole("heading", { name: "Bond marketplace demo" }).waitFor();
scripts\capture-task-012.ts:  await page.goto(`${baseUrl}/products/bond-marketplace-demo`);
scripts\capture-task-012.ts:  await page.getByRole("heading", { name: "Bond marketplace demo" }).waitFor();
scripts\capture-task-014.ts:  const placeholders = featureFlagKeys.map(() => "?").join(", ");
scripts\capture-task-014.ts:    `SELECT \`key\`, enabled FROM FeatureFlag WHERE \`key\` IN (${placeholders})`,
prisma\custom-build-seed.ts:        "Seeded rules are representative only and remain disabled publicly until the feature flag is reviewed.",
prisma\catalogue-seed.ts:            "Recommended 70 Ranged for this representative package.",
prisma\catalogue-seed.ts:            "Recommended 40 Defence for this representative package.",
prisma\catalogue-seed.ts:          "Allow-listed public stats for the prepared account representative package.",
prisma\catalogue-seed.ts:        "The representative prepared package assumes stronger confirmed readiness, but all seeded values still need client review.",
prisma\account-seed.ts:    stableKey: "account-iron-skilling-demo",
prisma\account-seed.ts:    stableKey: "account-pure-demo",
scripts\generate-finalization-artifacts.ts:  const placeholders = await rg(
scripts\generate-finalization-artifacts.ts:    "placeholder|TODO|FIXME|demo|representative|lorem|coming soon",
scripts\generate-finalization-artifacts.ts:    "placeholder-scan.md",
scripts\generate-finalization-artifacts.ts:Static scan pattern: placeholder, TODO, FIXME, demo, representative, lorem, coming soon.
scripts\generate-finalization-artifacts.ts:Findings are limited to historical task fixtures, compatibility scripts, report wording, or explicit external-input notes. Launch-facing footer placeholder links were removed.
scripts\generate-finalization-artifacts.ts:${placeholders.trim() || "No matches."}
src\content\homepage.ts:  demo: true,
src\content\homepage.ts:  demo: true;
src\content\homepage.ts:    demo: true,
src\content\homepage.ts:      "This card demonstrates the intended reading rhythm without inventing a customer, rating or claim.",
src\content\homepage.ts:    demo: true,
src\content\homepage.ts:    demo: true,
scripts\generate-task016-client-review-report.ts:    "- Terms, privacy and refund-policy placeholder pages require client legal review before production launch.",
scripts\validate-task007-existing-db.ts:  const representative = (
scripts\validate-task007-existing-db.ts:  if (!representative) {
scripts\validate-task007-existing-db.ts:    throw new Error("Task 007 representative premium config is missing.");
scripts\validate-task007-existing-db.ts:  if (representative.configuratorType !== "FIRE_CAPE") {
scripts\validate-task007-existing-db.ts:    throw new Error("Task 007 representative config is not FIRE_CAPE.");
scripts\validate-task007-existing-db.ts:  if (!asBoolean(representative.supportsManualStatFallback)) {
scripts\validate-task007-existing-db.ts:  if (!asBoolean(representative.standardDeliveryEnabled)) {
scripts\validate-task007-existing-db.ts:  if (asBoolean(representative.priorityDeliveryEnabled)) {
scripts\validate-task007-existing-db.ts:  if (asBoolean(representative.expressDeliveryEnabled)) {
scripts\validate-task007-existing-db.ts:    representative,
scripts\validate-task007-existing-db.ts:      `Representative configurator type: ${summary.representative.configuratorType}`,
scripts\validate-task007-existing-db.ts:        summary.representative.supportsManualStatFallback,
scripts\validate-task007-existing-db.ts:        summary.representative.standardDeliveryEnabled,
scripts\validate-task007-existing-db.ts:        summary.representative.priorityDeliveryEnabled,
scripts\validate-task007-existing-db.ts:        summary.representative.expressDeliveryEnabled,
scripts\validate-task007-fresh-db.ts:    const representative = (
scripts\validate-task007-fresh-db.ts:    if (!representative) {
scripts\validate-task007-fresh-db.ts:    if (representative.configuratorType !== "FIRE_CAPE") {
scripts\validate-task007-fresh-db.ts:        `Expected FIRE_CAPE configurator, received ${representative.configuratorType}.`,
scripts\validate-task007-fresh-db.ts:    if (!asBoolean(representative.supportsManualStatFallback)) {
scripts\validate-task007-fresh-db.ts:    if (!asBoolean(representative.standardDeliveryEnabled)) {
scripts\validate-task007-fresh-db.ts:    if (asBoolean(representative.priorityDeliveryEnabled)) {
scripts\validate-task007-fresh-db.ts:    if (asBoolean(representative.expressDeliveryEnabled)) {
scripts\validate-task007-fresh-db.ts:      `Representative configurator type: ${representative.configuratorType}`,
scripts\validate-task007-fresh-db.ts:        representative.supportsManualStatFallback,
scripts\validate-task007-fresh-db.ts:        representative.standardDeliveryEnabled,
scripts\validate-task007-fresh-db.ts:        representative.priorityDeliveryEnabled,
scripts\validate-task007-fresh-db.ts:        representative.expressDeliveryEnabled,
scripts\validate-task011-fresh-db.ts:  const placeholders = customBuildPermissionKeys.map(() => "?").join(", ");
scripts\validate-task011-fresh-db.ts:    `SELECT COUNT(*) AS value FROM Permission WHERE \`key\` IN (${placeholders})`,
scripts\validate-task011-existing-db.ts:  const placeholders = customBuildPermissionKeys.map(() => "?").join(", ");
scripts\validate-task011-existing-db.ts:    `SELECT COUNT(*) AS value FROM Permission WHERE \`key\` IN (${placeholders})`,
scripts\validate-task012-existing-db.ts:  const placeholders = tableNames.map(() => "?").join(", ");
scripts\validate-task012-existing-db.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task012-existing-db.ts:  const placeholders = productPermissionKeys.map(() => "?").join(", ");
scripts\validate-task012-existing-db.ts:    `SELECT COUNT(*) AS value FROM Permission WHERE \`key\` IN (${placeholders})`,
scripts\validate-task012-existing-db.ts:         WHERE product.stableKey = 'product-rune-essence-demo'
scripts\validate-task012-fresh-db.ts:  const placeholders = tableNames.map(() => "?").join(", ");
scripts\validate-task012-fresh-db.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task012-fresh-db.ts:  const placeholders = productPermissionKeys.map(() => "?").join(", ");
scripts\validate-task012-fresh-db.ts:    `SELECT COUNT(*) AS value FROM Permission WHERE \`key\` IN (${placeholders})`,
scripts\validate-task012-transactions.ts:  const placeholders = tableNames.map(() => "?").join(", ");
scripts\validate-task012-transactions.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task013-existing-db.ts:  const placeholders = newTables.map(() => "?").join(", ");
scripts\validate-task013-existing-db.ts:       AND TABLE_NAME IN (${placeholders})`,
src\tests\product-route.test.ts:    stableKey: "product-demo",
src\tests\product-route.test.ts:    slug: "demo-product",
src\tests\product-route.test.ts:    stableKey: "product-demo",
src\tests\product-route.test.ts:      productSlug: "demo-product",
src\tests\product-estimate.test.ts:      stableKey: "product-demo",
src\tests\product-estimate.test.ts:      slug: "demo-product",
scripts\validate-task013-fresh-db.ts:  const placeholders = tableNames.map(() => "?").join(", ");
scripts\validate-task013-fresh-db.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task013-fresh-db.ts:  const placeholders = checkoutPermissionKeys.map(() => "?").join(", ");
scripts\validate-task013-fresh-db.ts:    `SELECT COUNT(*) AS value FROM Permission WHERE \`key\` IN (${placeholders})`,
scripts\validate-task013-fresh-db.ts:  const placeholders = task013Tables.map(() => "?").join(", ");
scripts\validate-task013-fresh-db.ts:       AND TABLE_NAME IN (${placeholders})
scripts\validate-task013-fresh-db.ts:  const placeholders = task013Tables.map(() => "?").join(", ");
scripts\validate-task013-fresh-db.ts:       AND TABLE_NAME IN (${placeholders})
scripts\validate-task014-auth.ts:      [customerId, "argon2id-task014-placeholder"],
scripts\validate-task014-auth.ts:      [staffId, "argon2id-task014-placeholder"],
scripts\validate-task014-auth.ts:      "argon2id-task014-updated-placeholder",
src\tests\homepage-content.test.ts:  it("marks every unapproved feedback item as demo content", () => {
src\tests\homepage-content.test.ts:    expect(feedbackPreviews.every(({ demo }) => demo)).toBe(true);
scripts\validate-task014-existing-db.ts:  const placeholders = newTables.map(() => "?").join(", ");
scripts\validate-task014-existing-db.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task016-existing-db.ts:  const placeholders = task016Tables.map(() => "?").join(", ");
scripts\validate-task016-existing-db.ts:       AND TABLE_NAME IN (${placeholders})`,
scripts\validate-task015-existing-db.ts:  const placeholders = chatTables.map(() => "?").join(", ");
scripts\validate-task015-existing-db.ts:       AND TABLE_NAME IN (${placeholders})`,
src\app\(public)\page.tsx:              preview demonstrates the information hierarchy only.
src\app\(public)\page.tsx:          <div className="calculator-stage relative" data-content-status="demo">
src\app\(public)\page.tsx:              information shown here is demonstration content.
src\app\(public)\page.tsx:          <div className="tracking-stage relative" data-content-status="demo">
src\components\ui\input.tsx:        "border-border-strong/70 bg-background/35 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary/20 aria-invalid:border-danger aria-invalid:ring-danger/20 h-12 w-full rounded-xl border px-4 text-sm shadow-[inset_0_1px_6px_rgb(0_0_0_/_0.14)] transition outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
src\app\(public)\services\page.tsx:            placeholder="Search services and descriptions"
src\components\product-marketplace.tsx:              placeholder="Search public product text"
src\components\product-marketplace.tsx:          placeholder="Min"
src\components\product-marketplace.tsx:          placeholder="Max"
src\components\premium-configurator-engine.tsx:                        placeholder="No password, PIN or authenticator code"
src\components\premium-admin.tsx:            placeholder="Stats|Public stats|Attack level|60 Attack required|SKILL|AUTOMATIC|skill.attack.level|GREATER_THAN_OR_EQUAL|60|Optional guidance"
src\components\premium-admin.tsx:            placeholder="Can I use my own gear?|Yes. Confirm gear before requesting review."
src\components\checkout-form.tsx:          className="border-border-strong/70 bg-background/35 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary/20 min-h-28 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
src\components\bossing-calculator-engine.tsx:                    placeholder="Do not enter a password"
src\components\chat-live.tsx:        className="border-border-strong/70 bg-background/50 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary/20 min-h-24 w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
src\components\chat-live.tsx:        placeholder="Type a plain-text message"
src\components\offering-admin.tsx:          placeholder="tier|hard|Hard"
src\components\bossing-admin.tsx:            placeholder="skill.attack.level|Attack level|60|Optional guidance"
src\components\bossing-admin.tsx:            placeholder="Gear confirmation|Confirm gear and supplies|CUSTOMER_CONFIRMED|Guidance"
src\components\marketplace-search.tsx:          placeholder="Search quests, skills, bosses, gold or account services"
src\components\marketplace-search.tsx:          className="text-text-primary placeholder:text-text-muted min-w-0 flex-1 bg-transparent py-2 text-sm outline-none sm:text-base"
src\components\gold-trading-engine.tsx:                    placeholder="Enter amount"
src\components\gold-trading-engine.tsx:                      placeholder="No password, PIN or authenticator code"
src\components\design-system-showcase.tsx:                placeholder="name@example.com"
src\components\login-form.tsx:            placeholder="admin@example.com"
src\components\login-form.tsx:            placeholder="Enter your password"
src\components\account-marketplace.tsx:              placeholder="Search public listing text"
src\components\account-marketplace.tsx:          placeholder="Min"
src\components\account-marketplace.tsx:          placeholder="Max"
src\app\(admin)\admin\catalogue\categories\page.tsx:          placeholder="Search category name or slug"
src\app\(admin)\admin\catalogue\services\page.tsx:          placeholder="Search services"
```
