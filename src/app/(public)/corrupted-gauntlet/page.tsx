import { notFound } from "next/navigation";
import { Gem } from "lucide-react";
import { BossingCalculatorEngine } from "@/components/bossing-calculator-engine";
import { DirectServiceHero } from "@/components/direct-service-hero";
import {
  getCatalogueFeatureFlags,
  getPublicBossingCalculatorService,
} from "@/lib/catalogue/queries";
import { publicPageMetadata } from "@/lib/seo/public";
import { JsonLd } from "@/components/seo-jsonld";
import { siteUrl } from "@/lib/seo/public";

export const dynamic = "force-dynamic";
export const metadata = publicPageMetadata(
  "Corrupted Gauntlet Service",
  "Configure Corrupted Gauntlet completions, quantity, account mode and delivery. See your current price before adding to cart.",
  "/corrupted-gauntlet",
  "/artwork/services/gauntlet.webp",
);
export default async function CorruptedGauntletPage() {
  const [engine, flags] = await Promise.all([
    getPublicBossingCalculatorService({
      categorySlug: "bossing-pvm",
      serviceSlug: "pvm-support",
    }),
    getCatalogueFeatureFlags(),
  ]);
  if (!engine || !flags.bossing_calculator_enabled) notFound();
  const boss = engine.bosses.find((b) => /corrupted gauntlet/i.test(b.name));
  if (!boss) notFound();
  return (
    <main id="main-content" className="service-storefront min-h-[70vh]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Corrupted Gauntlet Service",
          url: siteUrl("/corrupted-gauntlet"),
          description:
            "Choose Corrupted Gauntlet completions, account mode and delivery for a server-calculated service quote.",
          provider: {
            "@type": "Organization",
            name: "OSRS Services",
            url: siteUrl("/"),
          },
        }}
      />
      <DirectServiceHero
        eyebrow="Direct ordering · PvM"
        title="Corrupted Gauntlet"
        accent="Service"
        description="Choose your completion count, account mode and delivery. Your account access and requirements are reviewed before starting."
        icon={Gem}
      />
      <BossingCalculatorEngine
        service={engine.service}
        bosses={[boss]}
        initialBossKey={boss.bossKey}
        rule={engine.rule}
        requestHref="/custom-order"
        eligibilityEnabled={Boolean(flags.rsn_eligibility_enabled)}
      />
    </main>
  );
}
