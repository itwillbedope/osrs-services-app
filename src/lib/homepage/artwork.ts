import type { HomepageCard } from "./core";

const serviceArt = {
  "/quiver": {
    src: "/artwork/services/quiver.webp",
    alt: "Teal and gold quiver with feathered arrows beside a Colosseum arena",
  },
  "/skills": {
    src: "/artwork/services/skills.webp",
    alt: "Sword, axe and training dummy at a woodland training camp",
  },
  "/bossing": {
    src: "/artwork/services/bossing.webp",
    alt: "Armored adventurer confronting a dragon in a ruined arena",
  },
  "/infernal": {
    src: "/artwork/services/infernal.webp",
    alt: "Adventurer wearing a glowing Infernal cape in a volcanic cavern",
  },
  "/quests": {
    src: "/artwork/services/quests.webp",
    alt: "Map, compass and scrolls on an adventurer's expedition table",
  },
  "/diaries": {
    src: "/artwork/services/diaries.webp",
    alt: "Leather achievement journal with a golden star clasp",
  },
  "/gold": {
    src: "/artwork/services/gold.webp",
    alt: "Treasure chest filled with gold coins in a castle treasury",
  },
  "/products": {
    src: "/artwork/services/items.webp",
    alt: "Sword, shield, helmet and gemstone displayed in an armory",
  },
  "/accounts": {
    src: "/artwork/services/accounts.webp",
    alt: "Armored adventurer ready for a new journey at a castle",
  },
  "/misc-gathering": {
    src: "/artwork/services/gathering.webp",
    alt: "Gathered herbs, logs, ore and fish beside a woodland river",
  },
} as const;

export function serviceArtwork(href: string) {
  return serviceArt[href as keyof typeof serviceArt];
}

/** Preserve Admin artwork; replace only missing/legacy reference-board defaults. */
export function homepageArtwork(card: HomepageCard) {
  if (
    card.imagePath &&
    card.imagePath !== "/artwork/osrs-reference-board.jpeg"
  ) {
    return { src: card.imagePath, alt: card.imageAltText };
  }
  const subject = `${card.id} ${card.title}`;
  if (/gauntlet/i.test(subject))
    return {
      src: "/artwork/services/gauntlet.webp",
      alt: "Crimson crystalline guardian in the Corrupted Gauntlet",
    };
  if (/zulrah/i.test(subject))
    return {
      src: "/artwork/services/zulrah.webp",
      alt: "Emerald serpent rising from the mist of an ancient swamp",
    };
  if (/raids/i.test(subject))
    return {
      src: "/artwork/services/raids.webp",
      alt: "Warrior, ranger and mage entering a vast ancient raid temple",
    };
  return serviceArtwork(card.href) ?? serviceArt["/products"];
}
