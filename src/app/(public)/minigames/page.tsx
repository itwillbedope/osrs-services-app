import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";
import { DirectServiceHero } from "@/components/direct-service-hero";
import { MinigamesEngine } from "@/components/minigames-engine";
import { getDirectOrderService } from "@/lib/direct-order/server";
import { JsonLd } from "@/components/seo-jsonld";
import { publicPageMetadata, siteUrl } from "@/lib/seo/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = publicPageMetadata(
  "OSRS Minigame Services | Torso, Void, LMS & Rewards",
  "Browse OSRS minigame rewards, outfits, points and unlocks. Choose quantities, review requirements and order Barbarian Assault, Pest Control, LMS and more.",
  "/minigames",
  "/artwork/services/minigames.webp",
);
const faqs = [
  [
    "How are minigame services priced?",
    "Each option displays its base rate and quantity unit. The order summary confirms the total using your selected amount, account type and optional adjustments.",
  ],
  [
    "Can I choose my amount before selecting a service?",
    "Yes. Enter the quantity first, then select the service. You can select multiple services and review them together in the order summary.",
  ],
  [
    "What happens if I am missing requirements?",
    "Requirements are reviewed before starting. Additional levels, access or preparation may need a separate quote, which support confirms with you.",
  ],
  [
    "Can I choose a stream for my minigame service?",
    "Yes. Select Stream option when configuring your minigame services. The displayed Stream surcharge is included in the order summary, cart and checkout. Support confirms streaming arrangements before starting. Stream is unavailable for Infernal Cape and Colosseum Quiver services.",
  ],
];
export default async function MinigamesPage() {
  const service = await getDirectOrderService(
    "minigames",
    "minigames-services",
  );
  if (!service) notFound();
  return (
    <main id="main-content" className="service-storefront min-h-[70vh]">
      <DirectServiceHero
        eyebrow="Rewards · points · unlocks"
        title="OSRS"
        accent="Minigames"
        description="Choose the rewards you want, set your amount and leave the grind to our team."
        artwork="/artwork/services/minigames.webp"
        icon={Gamepad2}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "OSRS Minigame Services",
          url: siteUrl("/minigames"),
          description:
            "Minigame rewards, outfits, points and account unlock services.",
          provider: {
            "@type": "Organization",
            name: "OSRS Services",
            url: siteUrl("/"),
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "OSRS Minigames",
            itemListElement: service.offerings.map((offering) => ({
              "@type": "Offer",
              name: `${offering.groupLabel} · ${offering.name}`,
              url: siteUrl(`/minigames#${offering.slug}`),
              priceCurrency: "USD",
              price: ((offering.basePriceCents ?? 0) / 100).toFixed(2),
              description: `Base rate ${offering.pricingUnit}. Account requirements and delivery timing are reviewed before starting.`,
              itemOffered: { "@type": "Service", name: offering.name },
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: siteUrl("/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Services",
              item: siteUrl("/services"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Minigames",
              item: siteUrl("/minigames"),
            },
          ],
        }}
      />
      <MinigamesEngine service={service} />
      <section className="store-panel minigames-faq">
        <h2>Minigames questions</h2>
        {faqs.map(([question, answer]) => (
          <details key={question} className="store-details">
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(([name, text]) => ({
            "@type": "Question",
            name,
            acceptedAnswer: { "@type": "Answer", text },
          })),
        }}
      />
    </main>
  );
}
