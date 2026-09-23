import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { homepageArtwork, serviceArtwork } from "@/lib/homepage/artwork";
import { StoreTrustStrip } from "@/components/store-trust-strip";
import Link from "next/link";
import { getDiscordHref } from "@/config/public-navigation";

import {
  defaultHomepageSections,
  fallbackHomepageCards,
  type HomepageCard,
} from "@/lib/homepage/core";

const title = "OSRS Services | Hand-Played Boosting & Marketplace";
export const dynamic = "force-dynamic";
const description =
  "Professional OSRS boosting, account builds, gold, items and PvM services with secure support and clear order tracking.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://osrsservices.com",
  ),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "OSRS Services",
    title,
    description,
    images: [
      {
        url: "/artwork/inferno-hero.webp",
        alt: "OSRS Services inferno battle artwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/artwork/inferno-hero.webp"],
  },
  robots: { index: true, follow: true },
};

function sectionByKey(
  sections: readonly { sectionKey: string; title: string; enabled: boolean }[],
  key: string,
) {
  return sections.find((section) => section.sectionKey === key);
}

function CardArtwork({
  card,
  kind,
}: {
  card: HomepageCard;
  kind: "category" | "service" | "featured";
}) {
  const artwork = homepageArtwork(card);
  return (
    <div className="relative size-full overflow-hidden">
      {artwork.src.startsWith("/") ? (
        <Image
          src={artwork.src}
          alt={artwork.alt}
          fill
          sizes={
            kind === "category"
              ? "(max-width: 600px) 50vw, (max-width: 1279px) 33vw, 320px"
              : "(max-width: 600px) 50vw, 112px"
          }
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized={artwork.src.startsWith("/uploads/")}
        />
      ) : (
        <div
          className="size-full bg-cover bg-center transition duration-300 group-hover:scale-105"
          style={{
            backgroundImage: `url(${JSON.stringify(artwork.src).slice(1, -1)})`,
          }}
          aria-label={artwork.alt}
          role="img"
        />
      )}
    </div>
  );
}

async function loadHomepage() {
  const databaseConfigured = Boolean(
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
  );
  if (databaseConfigured) {
    try {
      const { getPublicHomepageContent } =
        await import("@/lib/homepage/server");
      return await getPublicHomepageContent();
    } catch {
      // Keep the storefront available while a migration or database connection is recovering.
    }
  }
  return {
    sections: defaultHomepageSections,
    cards: fallbackHomepageCards,
  };
}

export default async function Homepage() {
  const { sections, cards } = await loadHomepage();
  const categorySection = sectionByKey(sections, "main-categories");
  const serviceSection = sectionByKey(sections, "main-services");
  const featuredSection = sectionByKey(sections, "featured-services");
  const categories = cards.filter((card) => card.placement === "MAIN_CATEGORY");
  const featured = cards.filter(
    (card) => card.placement === "FEATURED_SERVICE",
  );
  const mainServices = [
    ["Skills", "/skills", "Level up your account"],
    ["Bossing", "/bossing", "Choose your next challenge"],
    ["Infernal", "/infernal", "Claim your cape"],
    ["Quests", "/quests", "Complete your journey"],
    ["Diaries", "/diaries", "Unlock new content"],
    ["Gold", "/gold", "See the current gold rate"],
    ["Items", "/products", "Find your next upgrade"],
    ["Accounts", "/accounts", "Explore available accounts"],
    ["Misc Gathering", "/misc-gathering", "Resources, runs and more"],
  ] as const;
  return (
    <main id="main-content" className="reference-home">
      <section className="reference-home-hero">
        <div className="reference-home-art">
          <Image
            src="/artwork/inferno-hero.webp"
            alt="An adventurer facing a towering lava-armored monster in the Inferno"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 1100px"
          />
        </div>
        <div className="reference-home-copy">
          <p className="reference-eyebrow">
            Professional OSRS boosting services
          </p>
          <h1>
            CONQUER
            <br />
            ACHIEVE
            <br />
            <em>LEVEL UP</em>
          </h1>
          <h2>Trusted OSRS Services</h2>
          <p>Hand trained · Clear pricing · Personal support</p>
          <div className="reference-home-actions">
            <a className="reference-primary-button" href="#main-services">
              Browse Services <ArrowRight size={18} />
            </a>
            <a className="reference-secondary-button" href={getDiscordHref()}>
              <span className="reference-discord-icon" aria-hidden="true" />
              Join our Discord
            </a>
          </div>
        </div>
        <p className="reference-home-quote">
          More than a service.
          <br />A gaming partner.
        </p>
      </section>
      <StoreTrustStrip />
      {serviceSection?.enabled && (
        <section className="reference-home-services" id="main-services">
          <div className="reference-section-heading">
            <div>
              <h2>{serviceSection.title.toUpperCase()}</h2>
              <p>
                Everything you need for your OSRS journey, all in one place.
              </p>
            </div>
            <span>
              PLAY BETTER
              <br />
              <strong>ACHIEVE MORE</strong>
            </span>
          </div>
          <div className="reference-home-service-grid">
            {mainServices.map(([name, href, description]) => (
              <Link className="reference-home-service" href={href} key={href}>
                <span className="reference-home-service-art">
                  <Image
                    src={serviceArtwork(href).src}
                    alt={serviceArtwork(href).alt}
                    fill
                    sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1279px) 20vw, 180px"
                    className="object-cover"
                  />
                </span>
                <h3>{name}</h3>
                <p>{description}</p>
                <span className="reference-card-link">
                  View Services <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {categorySection?.enabled && (
        <section className="reference-home-categories">
          <h2>{categorySection.title}</h2>
          <div>
            {categories.map((card) => (
              <Link
                href={card.href}
                key={card.id}
                className="reference-category"
              >
                <span className="reference-category-art">
                  <CardArtwork card={card} kind="category" />
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span>
                  {card.ctaText} <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {featuredSection?.enabled && featured.length > 0 && (
        <section className="reference-featured">
          <h2>{featuredSection.title}</h2>
          <div>
            {featured.map((card) => (
              <Link href={card.href} key={card.id}>
                <span className="reference-featured-art">
                  <CardArtwork card={card} kind="featured" />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <strong>{card.priceLabel}</strong>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {serviceSection?.enabled &&
        cards.some((card) => card.placement === "MAIN_SERVICE") && (
          <section className="reference-featured">
            <h2>More Services</h2>
            <div>
              {cards
                .filter((card) => card.placement === "MAIN_SERVICE")
                .map((card) => (
                  <Link href={card.href} key={card.id}>
                    <span className="reference-featured-art">
                      <CardArtwork card={card} kind="service" />
                    </span>
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                      {card.badge && <small>{card.badge}</small>}
                      <strong>{card.priceLabel}</strong>
                      <p>{card.ctaText}</p>
                    </div>
                    <ArrowRight size={18} />
                  </Link>
                ))}
            </div>
          </section>
        )}
    </main>
  );
}
