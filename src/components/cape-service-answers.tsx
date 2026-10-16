import { JsonLd } from "@/components/seo-jsonld";
import { parseCapePricing } from "@/lib/premium/cape-pricing";
import { formatCents } from "@/lib/premium/money";
import { siteUrl } from "@/lib/seo/public";
export function CapeServiceAnswers({
  infernal,
  configuration,
  packages,
}: {
  infernal: boolean;
  configuration: unknown;
  packages: { name: string; basePriceCents: number }[];
}) {
  const rules = parseCapePricing(configuration);
  const name = infernal ? "Infernal Cape Service" : "Dizana’s Quiver Service";
  const path = infernal ? "/infernal" : "/quiver";
  const faqs = [
    {
      question: `How much does the ${infernal ? "Infernal Cape" : "Quiver"} service cost?`,
      answer: `Published setup base prices: ${packages.map((p) => `${p.name}: ${formatCents(p.basePriceCents)}`).join("; ")}. Account build, lower combat stats${infernal ? ", missing Rigour or Blowpipe, an active Inferno Slayer task" : ""} and any configured delivery fee adjust the estimate shown before adding to cart.`,
    },
    {
      question: "How are stat and account build adjustments calculated?",
      answer: `Ranged below ${rules.ranged} or Magic below ${rules.magic} adds ${rules.lowStatsBps / 100}% once, even if both are lower. Pure and 1 Defence builds add ${rules.pureBps / 100}% and ${rules.oneDefenceBps / 100}% respectively; Zerker adds ${rules.zerkerBps / 100}%. All percentages use the selected setup’s base price and add together without compounding. Defence, Prayer and Hitpoints have no separate automatic charge.`,
    },
    {
      question:
        "Can I order with a restricted build or skip entering my stats?",
      answer:
        "Restricted builds require a personalized quote through Live Chat Support. If you skip the stat check, stat-based pricing must be confirmed before checkout. Automatic cart ordering is available after entering valid stats for a supported build.",
    },
    {
      question: "Who provides the gear and supplies?",
      answer:
        "Customers must provide all required gear, equipment and supplies. The selected gear setup affects completion difficulty and timing. Support reviews access and setup before the service starts.",
    },
    {
      question: "Is Stream available for this service?",
      answer:
        "Stream is unavailable for Infernal Cape and Dizana’s Quiver. Standard and any enabled Express delivery options remain separate from Stream.",
    },
    ...(!infernal
      ? [
          {
            question: "What does the Quiver package include?",
            answer:
              "One full Fortis Colosseum clear through Sol Heredit for Dizana’s Quiver. Charging or blessing with sunfire splinters is a separate request.",
          },
        ]
      : []),
  ];
  return (
    <section className="store-panel custom-order-faq">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name,
          url: siteUrl(path),
          description: faqs[0]!.answer,
          provider: { "@id": siteUrl("/#organization") },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: { "@type": "Answer", text: q.answer },
          })),
        }}
      />
      <h2>
        {infernal ? "Infernal Cape" : "Dizana’s Quiver"} service questions
      </h2>
      {faqs.map((q) => (
        <details key={q.question}>
          <summary>{q.question}</summary>
          <p>{q.answer}</p>
        </details>
      ))}
    </section>
  );
}
