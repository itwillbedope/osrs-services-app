import { siteUrl } from "@/lib/seo/public";
export function GET() {
  const body = `# OSRS Services\n\n> OSRS service catalogue with account preparation review and server-confirmed order pricing.\n\n## Services\n${[
    ["Minigames", "/minigames"],
    ["Skilling", "/skills"],
    ["Bossing", "/bossing"],
    ["Infernal Cape", "/infernal"],
    ["Dizana's Quiver", "/quiver"],
    ["Quests", "/quests"],
    ["Achievement Diaries", "/diaries"],
    ["Gathering", "/misc-gathering"],
  ]
    .map(([name, path]) => `- [${name}](${siteUrl(path!)})`)
    .join(
      "\n",
    )}\n\n## Customer information\n- [Support](${siteUrl("/support")})\n- [Terms](${siteUrl("/terms")})\n- [Privacy](${siteUrl("/privacy")})\n- [Refund policy](${siteUrl("/refund-policy")})\n- [Sitemap](${siteUrl("/sitemap.xml")})\n\nPrices, requirements and payment availability are published on the corresponding pages. Account preparation and delivery timing are confirmed before starting. No guaranteed game outcome or search ranking is implied.\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
