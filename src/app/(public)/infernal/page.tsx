import { CapeServiceAnswers } from "@/components/cape-service-answers";
import { CapeConfigurator } from "@/components/cape-configurator";
import { publicPageMetadata } from "@/lib/seo/public";
import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { notFound } from "next/navigation";

import { DirectServiceHero } from "@/components/direct-service-hero";
import { PremiumConfiguratorEngine } from "@/components/premium-configurator-engine";
import { getDiscordHref } from "@/config/public-navigation";
import {
  getCatalogueFeatureFlags,
  getPublicPremiumConfiguratorService,
} from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata(
  "Infernal Cape Service",
  "Configure an Infernal Cape service using admin-managed weapons, account modes, options, requirements and pricing.",
  "/infernal",
);

export default async function InfernalPage() {
  const [engine, flags] = await Promise.all([
    getPublicPremiumConfiguratorService({
      categorySlug: "premium-services",
      serviceSlug: "infernal-cape-service",
    }),
    getCatalogueFeatureFlags(),
  ]);
  if (!engine || !flags.premium_configurator_enabled) notFound();
  return (
    <main id="main-content" className="service-storefront min-h-[70vh]">
      <DirectServiceHero
        eyebrow="Premium end-game service"
        title="Infernal Cape"
        accent="Service"
        description="Choose your setup and configure your journey to the Infernal Cape."
        icon={Flame}
        inferno
      />
      {engine.rule?.capePricingRules ? (
        <CapeConfigurator
          service={engine.service}
          packages={engine.packages}
          rule={engine.rule}
        />
      ) : (
        <PremiumConfiguratorEngine
          service={engine.service}
          packages={engine.packages}
          options={engine.options}
          rule={engine.rule}
          requestHref={getDiscordHref()}
          eligibilityEnabled={Boolean(flags.rsn_eligibility_enabled)}
        />
      )}
      {engine?.rule?.capePricingRules ? (
        <CapeServiceAnswers
          infernal={true}
          configuration={engine.rule.capePricingRules}
          packages={engine.packages}
        />
      ) : null}
    </main>
  );
}
