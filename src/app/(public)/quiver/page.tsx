import { CapeServiceAnswers } from "@/components/cape-service-answers";
import { CapeConfigurator } from "@/components/cape-configurator";
import { publicPageMetadata } from "@/lib/seo/public";
import type { Metadata } from "next";
import { Target } from "lucide-react";
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
  "Dizana's Quiver | Fortis Colosseum Service",
  "Configure your Fortis Colosseum completion for Dizana's Quiver, including account type, gear review and Standard or Express delivery.",
  "/quiver",
);

export default async function QuiverPage() {
  const [engine, flags] = await Promise.all([
    getPublicPremiumConfiguratorService({
      categorySlug: "premium-services",
      serviceSlug: "dizanas-quiver-service",
    }),
    getCatalogueFeatureFlags(),
  ]);
  if (!flags.premium_configurator_enabled) notFound();
  return (
    <main id="main-content" className="service-storefront min-h-[70vh]">
      <DirectServiceHero
        eyebrow="Fortis Colosseum"
        title="Dizana's Quiver"
        accent="Service"
        description="Conquer the Fortis Colosseum and face Sol Heredit for Dizana's Quiver. Configure your account and setup below."
        icon={Target}
      />
      <section
        className="store-panel reference-quiver-intro"
        hidden={Boolean(engine?.rule?.capePricingRules)}
      >
        <span
          className="reference-quiver-art"
          role="img"
          aria-label="Quiver artwork"
        />
        <div>
          <h2>Fortis Colosseum completion</h2>
          <p>
            {engine?.service.content ??
              "Plan a complete Colosseum run for Dizana's Quiver. Contact support to confirm your account setup, requirements and current quote."}
          </p>
        </div>
      </section>
      {engine ? (
        engine.rule?.capePricingRules ? (
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
        )
      ) : (
        <section className="store-panel">
          <h2>Request your Quiver quote</h2>
          <p>
            Contact our team to confirm current Colosseum pricing and the setup
            for your account.
          </p>
          <a className="store-primary-button" href={getDiscordHref()}>
            Discuss your Quiver order
          </a>
        </section>
      )}
      {engine?.rule?.capePricingRules ? (
        <CapeServiceAnswers
          infernal={false}
          configuration={engine.rule.capePricingRules}
          packages={engine.packages}
        />
      ) : null}
    </main>
  );
}
