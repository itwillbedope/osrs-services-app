"use client";

import Image from "next/image";
import { CapeEquipmentIcon } from "@/components/cape-equipment-icon";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BowArrow,
  Crown,
  Heart,
  Shield,
  Skull,
  Sparkles,
  Swords,
  WandSparkles,
} from "lucide-react";
import {
  AddEstimateToCart,
  MobileEstimateCart,
} from "@/components/add-estimate-to-cart";
import { ReferenceArt } from "@/components/reference-art";
import {
  calculateCapePrice,
  capeBuilds,
  parseCapePricing,
  capeSkills,
  percentLabel,
} from "@/lib/premium/cape-pricing";
import { formatCents } from "@/lib/premium/money";
import { gameModeLabels } from "@/lib/catalogue/constants";

type CapePackage = {
  slug: string;
  name: string;
  shortDescription: string;
  basePriceCents: number;
  gearNotes: string | null;
};
type CapeRule = {
  capePricingRules?: unknown;
  configuratorType: string;
  standardDeliveryEnabled: boolean;
  standardDeliveryLabel: string;
  standardDeliveryEstimate: string | null;
  priorityDeliveryEnabled: boolean;
  priorityDeliveryLabel: string;
  priorityDeliveryEstimate: string | null;
  expressDeliveryEnabled: boolean;
  expressDeliveryLabel: string;
  expressDeliveryEstimate: string | null;
};
type GameMode = keyof typeof gameModeLabels;
const statIcons = [BowArrow, WandSparkles, Shield, Sparkles, Heart];

export function CapeConfigurator({
  service,
  packages,
  rule,
}: {
  service: { id: string; gameModes: { gameMode: GameMode }[] };
  packages: CapePackage[];
  rule: CapeRule;
}) {
  const config = parseCapePricing(rule.capePricingRules);
  const infernal = rule.configuratorType === "INFERNAL_CAPE";
  const [packageSlug, setPackageSlug] = useState(packages[0]?.slug ?? "");
  const selected = packages.find((p) => p.slug === packageSlug) ?? packages[0];
  const [build, setBuild] = useState("main");
  const modes = service.gameModes.filter(
    (m) => infernal || m.gameMode !== "HARDCORE_IRONMAN",
  );
  const [gameMode, setGameMode] = useState<GameMode>(
    modes[0]?.gameMode ?? "NORMAL",
  );
  const [manual, setManual] = useState(true);
  const [levels, setLevels] = useState<Record<string, string>>(() =>
    Object.fromEntries(capeSkills.map((s) => [s, String(config[s])])),
  );
  const [rigour, setRigour] = useState(true);
  const [blowpipe, setBlowpipe] = useState(true);
  const [task, setTask] = useState(false);
  const deliveries = [
    {
      speed: "STANDARD",
      label: rule.standardDeliveryLabel,
      estimate: rule.standardDeliveryEstimate,
      enabled: rule.standardDeliveryEnabled,
    },
    {
      speed: "PRIORITY",
      label: rule.priorityDeliveryLabel,
      estimate: rule.priorityDeliveryEstimate,
      enabled: rule.priorityDeliveryEnabled,
    },
    {
      speed: "EXPRESS",
      label: rule.expressDeliveryLabel,
      estimate: rule.expressDeliveryEstimate,
      enabled: rule.expressDeliveryEnabled,
    },
  ].filter((d) => d.enabled);
  const [speed, setSpeed] = useState(deliveries[0]?.speed ?? "STANDARD");
  const options = useMemo(
    () => [
      ...(build === "main" ? [] : [{ slug: build }]),
      ...(infernal && !rigour ? [{ slug: "rigour-unavailable" }] : []),
      ...(infernal && !blowpipe ? [{ slug: "blowpipe-unavailable" }] : []),
      ...(infernal && task ? [{ slug: "slayer-task" }] : []),
    ],
    [build, infernal, rigour, blowpipe, task],
  );
  const stats = capeSkills.map((s) => ({
    metricKey: `skill.${s}.level`,
    value: Number(levels[s]),
  }));
  const source =
    selected && manual && build !== "restricted-build"
      ? {
          serviceId: service.id,
          packageSlug: selected.slug,
          optionSelections: options,
          gameMode,
          customerGearConfirmed: true,
          includeDiscordStream: false,
          deliverySpeed: speed,
          configuration: { statCheckMode: "MANUAL", manualStats: stats },
        }
      : null;
  const key = JSON.stringify(source);
  const [quote, setQuote] = useState<{
    key: string;
    total: number;
    lines: { label: string; amountCents: number }[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { configuration, ...selection } = JSON.parse(key);
        const response = await fetch("/api/premium/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...selection, ...configuration }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok)
          throw new Error(payload.message ?? "Unable to confirm this price.");
        if (!controller.signal.aborted)
          setQuote({
            key,
            total: payload.estimate.estimatedTotalCents,
            lines: payload.estimate.lineItems,
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setQuote({
            key,
            total: 0,
            lines: [],
            error:
              error instanceof Error
                ? error.message
                : "Unable to confirm this price. Please retry.",
          });
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // The serialized source is the complete selection key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  let preview: ReturnType<typeof calculateCapePrice> | null = null;
  let validation = "";
  try {
    if (selected && build !== "restricted-build")
      preview = calculateCapePrice({
        configuration: config,
        baseCents: selected.basePriceCents,
        stats: manual
          ? stats
          : capeSkills.map((s) => ({
              metricKey: `skill.${s}.level`,
              value: config[s],
            })),
        options,
        infernal,
      });
  } catch (error) {
    validation =
      error instanceof Error ? error.message : "Check the account levels.";
  }
  const current = quote?.key === key ? quote : null;
  const ready = !!source && !!current && !current.error && !validation;
  const total = current && !current.error ? current.total : preview?.totalCents;
  const lines =
    current && !current.error
      ? current.lines
      : selected && preview
        ? [
            { label: selected.name, amountCents: selected.basePriceCents },
            ...preview.lines,
          ]
        : [];
  const currentDelivery = deliveries.find((d) => d.speed === speed);
  const baseMinimum = Math.min(...packages.map((p) => p.basePriceCents));
  const statSummary = capeSkills
    .map(
      (s) =>
        `${config[s]}+ ${s === "hitpoints" ? "Hitpoints" : s[0]!.toUpperCase() + s.slice(1)}`,
    )
    .join(", ");
  return (
    <div className="cape-page">
      <div className="cape-order-layout">
        <aside
          className="cape-art-panel"
          aria-label={
            infernal ? "Infernal Cape artwork" : "Fortis Colosseum artwork"
          }
        >
          {infernal ? (
            <ReferenceArt
              board="infernal"
              crop={[25, 270, 310, 600]}
              label="Warrior wearing an Infernal Cape"
            />
          ) : (
            <Image
              src="/artwork/services/quiver.webp"
              alt="Dizana’s Quiver at the Fortis Colosseum"
              fill
              sizes="220px"
              className="object-cover object-center"
            />
          )}
        </aside>
        <section className="store-panel cape-config">
          <div className="cape-section-title">
            <h2>Configure Your Order</h2>
            <Crown aria-hidden="true" />
          </div>
          <fieldset>
            <legend>
              Stat Check{" "}
              <span className="cape-muted">(Recommended levels)</span>
            </legend>
            <div className="cape-stats">
              {capeSkills.map((skill, i) => {
                const Icon = statIcons[i]!;
                return (
                  <label key={skill}>
                    <span>
                      <Icon aria-hidden="true" />
                      {skill === "hitpoints"
                        ? "Hitpoints (HP)"
                        : `${skill[0]!.toUpperCase()}${skill.slice(1)} level`}
                    </span>
                    <input
                      aria-label={`${skill[0]!.toUpperCase()}${skill.slice(1)} level`}
                      type="number"
                      min={1}
                      max={99}
                      disabled={!manual}
                      value={levels[skill]}
                      onChange={(e) =>
                        setLevels({ ...levels, [skill]: e.target.value })
                      }
                    />
                    <small>Recommended {config[skill]}+</small>
                  </label>
                );
              })}
            </div>
            <Notice>
              Recommended Stats: {statSummary}. Below {config.ranged} Ranged or{" "}
              {config.magic} Magic: {percentLabel(config.lowStatsBps)} Price
              Adjustment, applied once.
            </Notice>
            <div className="cape-stat-mode">
              <label>
                <input
                  type="radio"
                  name="stat-mode"
                  checked={manual}
                  onChange={() => setManual(true)}
                />
                Enter stats manually
              </label>
              <label>
                <input
                  type="radio"
                  name="stat-mode"
                  checked={!manual}
                  onChange={() => setManual(false)}
                />
                Continue without a stat check
              </label>
            </div>
            {!manual && (
              <Notice>
                Stat-based pricing must be confirmed before checkout. Contact
                Live Chat with your account details.
              </Notice>
            )}
          </fieldset>
          <fieldset>
            <legend>
              {infernal ? "Main weapon / setup" : "Gear setup"}{" "}
              <span className="cape-red">(affects price)</span>
            </legend>
            <div className={`cape-gear-cards ${infernal ? "cape-three" : ""}`}>
              {packages.map((p, i) => (
                <label
                  className={`cape-choice ${selected?.slug === p.slug ? "is-selected" : ""}`}
                  key={p.slug}
                >
                  <input
                    type="radio"
                    name="gear-setup"
                    checked={selected?.slug === p.slug}
                    onChange={() => setPackageSlug(p.slug)}
                  />
                  <span className="cape-gear-heading">{p.name}</span>
                  <span className="cape-equipment" aria-hidden="true">
                    {infernal ? (
                      <CapeEquipmentIcon
                        kind={
                          p.slug === "twisted-bow"
                            ? "twisted-bow"
                            : p.slug === "bowfa"
                              ? "bowfa"
                              : "crossbow"
                        }
                      />
                    ) : i === 0 ? (
                      <>
                        <CapeEquipmentIcon kind="twisted-bow" />
                        <CapeEquipmentIcon kind="scythe" />
                        <CapeEquipmentIcon kind="shadow" />
                      </>
                    ) : (
                      <>
                        <CapeEquipmentIcon kind="bowfa" />
                        <CapeEquipmentIcon kind="crossbow" />
                        <CapeEquipmentIcon kind="shadow" />
                      </>
                    )}
                  </span>
                  <strong>
                    {formatCents(p.basePriceCents)}{" "}
                    <small>
                      {i === 0
                        ? "Base Price"
                        : `+${formatCents(p.basePriceCents - baseMinimum)}`}
                    </small>
                  </strong>
                  <span className="cape-description">{p.shortDescription}</span>
                </label>
              ))}
            </div>
            <Notice>
              Your selected gear setup affects the difficulty and completion
              time. Customers must provide all required equipment and supplies.
            </Notice>
          </fieldset>
          <div className="cape-service-selects">
            <label className="store-field">
              Account game mode
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as GameMode)}
              >
                {modes.map((m) => (
                  <option value={m.gameMode} key={m.gameMode}>
                    {gameModeLabels[m.gameMode]}
                  </option>
                ))}
              </select>
            </label>
            <label className="store-field">
              Delivery speed
              <select value={speed} onChange={(e) => setSpeed(e.target.value)}>
                {deliveries.map((d) => (
                  <option key={d.speed} value={d.speed}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {infernal && (
            <fieldset>
              <legend>Gear and task status</legend>
              <div className="cape-gear-status">
                {[
                  {
                    name: "Rigour available?",
                    value: rigour,
                    set: setRigour,
                    rate: config.noRigourBps,
                    note: "if unavailable",
                    Icon: Sparkles,
                  },
                  {
                    name: "Blowpipe available?",
                    value: blowpipe,
                    set: setBlowpipe,
                    rate: config.noBlowpipeBps,
                    note: "if unavailable",
                    Icon: Swords,
                  },
                  {
                    name: "Inferno Slayer task?",
                    value: task,
                    set: setTask,
                    rate: -config.slayerDiscountBps,
                    note: "if active",
                    Icon: Skull,
                  },
                ].map((item) => (
                  <div key={item.name} className="cape-status-card">
                    <item.Icon aria-hidden="true" />
                    <strong>{item.name}</strong>
                    <span className={item.rate < 0 ? "cape-green" : "cape-red"}>
                      {percentLabel(item.rate)} {item.note}
                    </span>
                    <div role="group" aria-label={item.name}>
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={item.value === v}
                          onClick={() => item.set(v)}
                        >
                          {v ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend>
              Account build type{" "}
              <span className="cape-red">(affects price)</span>
            </legend>
            <div className="cape-builds">
              {capeBuilds.map((b) => (
                <label
                  key={b.slug}
                  className={`cape-choice ${build === b.slug ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="account-build"
                    value={b.slug}
                    checked={build === b.slug}
                    onChange={() => setBuild(b.slug)}
                  />
                  <span>{b.label}</span>
                  <strong>
                    {b.slug === "restricted-build"
                      ? "Custom quote"
                      : b.rule
                        ? percentLabel(config[b.rule])
                        : "Base price"}
                  </strong>
                </label>
              ))}
            </div>
            {build === "restricted-build" && (
              <Notice>
                Your account has special restrictions. Please contact our live
                chat agent and share your account build details to receive a
                personalized quote before placing your order.{" "}
                <Link href="/support">Contact Live Chat</Link>
              </Notice>
            )}
          </fieldset>
          {(validation || current?.error) && (
            <p role="alert" className="store-error">
              {validation || current?.error}
            </p>
          )}
        </section>
        <aside className="store-panel cape-summary">
          <h2>Order Summary</h2>
          <p className="cape-summary-price" aria-live="polite">
            {total == null ? "Custom quote" : formatCents(total)}
          </p>
          <dl>
            <div>
              <dt>Package</dt>
              <dd>
                {infernal
                  ? "Infernal Cape"
                  : "Dizana’s Quiver – Full Colosseum Clear"}
              </dd>
            </div>
            <div>
              <dt>{infernal ? "Weapon setup" : "Gear tier"}</dt>
              <dd>{selected?.name}</dd>
            </div>
            <div>
              <dt>Account game mode</dt>
              <dd>{gameModeLabels[gameMode]}</dd>
            </div>
            <div>
              <dt>Account build</dt>
              <dd>{capeBuilds.find((b) => b.slug === build)?.label}</dd>
            </div>
            <div>
              <dt>Delivery speed</dt>
              <dd>{currentDelivery?.label}</dd>
            </div>
            <div>
              <dt>Time estimate</dt>
              <dd>
                {currentDelivery?.estimate ?? "Confirmed before checkout"}
              </dd>
            </div>
          </dl>
          <h3>Price breakdown</h3>
          <dl>
            {lines.map((line, i) => (
              <div key={`${line.label}-${i}`}>
                <dt>{line.label}</dt>
                <dd
                  className={
                    line.amountCents < 0
                      ? "cape-green"
                      : i > 0 && line.amountCents > 0
                        ? "cape-red"
                        : ""
                  }
                >
                  {line.amountCents < 0 ? "−" : ""}
                  {formatCents(Math.abs(line.amountCents))}
                </dd>
              </div>
            ))}
          </dl>
          <div className="cape-final">
            <span>Final Estimated Price</span>
            <strong data-testid="cape-final-price" aria-live="polite">
              {total == null ? "Custom quote" : formatCents(total)}
            </strong>
          </div>
          {source && !current && (
            <p role="status" className="cape-muted">
              Confirming current price…
            </p>
          )}
          <AddEstimateToCart
            kind="PREMIUM_ESTIMATE"
            source={ready ? source : null}
            disabled={!ready}
          />
          <Link className="cape-custom-button" href="/custom-order">
            {infernal ? "Need a custom quote?" : "Need a custom order?"}
          </Link>
          <Link className="cape-chat-link" href="/support">
            Contact Live Chat
          </Link>
          <p className="cape-muted">
            Customers must provide all required gear, equipment, and supplies
            for the selected service.
          </p>
        </aside>
      </div>
      <section className="store-panel cape-guide">
        <h2>
          <Crown aria-hidden="true" /> Price Adjustment Guide
        </h2>
        <div className="cape-guide-grid">
          <div>
            <h3>
              1 · {infernal ? "Weapon setup prices" : "Gear setup details"}
            </h3>
            {packages.map((p) => (
              <p key={p.slug}>
                <strong>
                  {p.name} · {formatCents(p.basePriceCents)}
                </strong>
                <br />
                {p.gearNotes}
              </p>
            ))}
          </div>
          <div>
            <h3>2 · Stat adjustment</h3>
            <p>
              Below {config.ranged} Ranged or {config.magic} Magic:{" "}
              <b className="cape-red">
                {percentLabel(config.lowStatsBps)} once
              </b>
              .
            </p>
            <p>Recommended: {statSummary}.</p>
            <p>No separate Defence, Prayer or Hitpoints surcharge.</p>
            {infernal && (
              <p>
                No Rigour {percentLabel(config.noRigourBps)} · No Blowpipe{" "}
                {percentLabel(config.noBlowpipeBps)} · Active Inferno Slayer
                task{" "}
                <b className="cape-green">
                  {percentLabel(-config.slayerDiscountBps)}
                </b>
                .
              </p>
            )}
          </div>
          <div>
            <h3>3 · Account build adjustment</h3>
            {capeBuilds.map((b) => (
              <p key={b.slug}>
                {b.label}:{" "}
                <b>
                  {b.rule
                    ? percentLabel(config[b.rule])
                    : b.slug === "main"
                      ? "Base price"
                      : "Custom quote"}
                </b>
              </p>
            ))}
          </div>
          <div>
            <h3>4 · How the price is calculated</h3>
            <p>
              Selected base price × (1 + build % + stats %
              {infernal ? " + missing gear % − task discount %" : ""}).
            </p>
            <p>
              Percentages add together; they do not compound. Any configured
              delivery fee appears separately.
            </p>
            <p>
              {infernal
                ? `${packages[0]?.name}: missing both gear options = ${formatCents(Math.round(((packages[0]?.basePriceCents ?? 0) * (10000 + config.noRigourBps + config.noBlowpipeBps)) / 10000))}. ${packages[1]?.name}: Pure + lower Ranged = ${formatCents(Math.round(((packages[1]?.basePriceCents ?? 0) * (10000 + config.pureBps + config.lowStatsBps)) / 10000))}.`
                : `${packages[1]?.name}: Pure + lower Ranged = ${formatCents(Math.round(((packages[1]?.basePriceCents ?? 0) * (10000 + config.pureBps + config.lowStatsBps)) / 10000))}. ${packages[0]?.name}: Main + recommended stats = ${formatCents(packages[0]?.basePriceCents ?? 0)}.`}
            </p>
          </div>
        </div>
        <Notice>
          {infernal
            ? "Inferno access and your full setup are reviewed before starting."
            : "Charging or blessing the Quiver with sunfire splinters is a separate request."}
        </Notice>
      </section>
      {ready && (
        <MobileEstimateCart
          kind="PREMIUM_ESTIMATE"
          source={source}
          total={formatCents(current!.total)}
        />
      )}
    </div>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="cape-notice">
      <AlertTriangle aria-hidden="true" /> <span>{children}</span>
    </p>
  );
}
