import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { DirectServiceHero } from "@/components/direct-service-hero";
import { CustomOrderForm } from "@/components/custom-order-form";
import { JsonLd } from "@/components/seo-jsonld";
import { publicPageMetadata, siteUrl } from "@/lib/seo/public";
export const metadata = publicPageMetadata(
  "Custom OSRS Service Orders & Quotes",
  "Request a tailored OSRS service for mixed goals, restricted builds, skilling, bossing, raids or unlocks. Agree scope, price and timing with our team before ordering.",
  "/custom-order",
);
const questions = [
  {
    question: "Can I request a service that is not listed?",
    answer:
      "Yes. Describe your goal, current progress and account restrictions. Our support team reviews feasibility and provides a tailored quote. Acceptance is subject to the account setup and available service capacity.",
  },
  {
    question: "Does submitting a request create a paid order?",
    answer:
      "No. A custom request starts a private support conversation. Scope, pricing, requirements and timing must be agreed before any order or payment.",
  },
  {
    question: "How will I receive my quote?",
    answer:
      "Your request receives a reference and appears in the live support inbox. Return to Live Chat Support in the same browser to see replies. You may also include an email or Discord contact for staff review.",
  },
  {
    question: "Who provides gear and supplies?",
    answer:
      "Customers must provide all required gear, equipment and supplies. Include the equipment available on your account so staff can quote accurately. Never share passwords or sensitive credentials in the request.",
  },
];
export default function CustomOrderPage() {
  return (
    <main id="main-content" className="service-storefront">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: questions.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Custom OSRS Service Quote",
          url: siteUrl("/custom-order"),
          description:
            "Staff-reviewed custom service scope, requirements, price and timing for individual OSRS account goals.",
          provider: {
            "@type": "Organization",
            name: "OSRS Services",
            url: siteUrl("/"),
          },
        }}
      />
      <DirectServiceHero
        eyebrow="Your goals · A tailored plan"
        title="Custom"
        accent="Orders"
        description="Can’t find exactly what you need? Tell us your goal and we’ll review the setup, scope and price with you."
        icon={ClipboardList}
      />
      <div className="custom-order-layout">
        <CustomOrderForm />
        <aside className="store-panel">
          <h2>How it works</h2>
          <ol>
            <li>
              <b>1. Describe your goal.</b> Include progress, quantity and
              account restrictions.
            </li>
            <li>
              <b>2. Review your quote.</b> Our team agrees the work,
              requirements and timing with you.
            </li>
            <li>
              <b>3. Confirm your order.</b> Proceed only after the scope and
              price are clear.
            </li>
          </ol>
          <p>
            Need an account built from scratch?{" "}
            <Link href="/custom-account-build">
              Use the account build planner.
            </Link>
          </p>
          <Link className="cape-custom-button" href="/support">
            Contact Live Chat
          </Link>
          <p className="cape-muted">
            Quotes are reviewed by people. No completion time or acceptance is
            guaranteed before review.
          </p>
        </aside>
      </div>
      <section className="store-panel custom-order-faq">
        <h2>Custom order questions</h2>
        {questions.map((q) => (
          <details key={q.question}>
            <summary>{q.question}</summary>
            <p>{q.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
