"use client";

import Image from "next/image";
import { Clock3, Search, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddEstimateToCart } from "@/components/add-estimate-to-cart";
import {
  calculateDirectOrderEstimate,
  directOrderLinePrice,
  facetValue,
  formatDirectOrderPrice,
  minigameModifiers,
  type DirectOrderOffering,
  type DirectOrderSelection,
} from "@/lib/direct-order/core";

type Service = {
  id: string;
  gameModes: { gameMode: string }[];
  offerings: DirectOrderOffering[];
};

export function MinigamesEngine({ service }: { service: Service }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [groupOptions, setGroupOptions] = useState<Record<string, string[]>>(
    {},
  );
  const [remote, setRemote] = useState(false);
  const [gameMode, setGameMode] = useState(
    service.gameModes[0]?.gameMode ?? "NORMAL",
  );
  const [quote, setQuote] = useState<{
    key: string;
    totalCents?: number;
    error?: string;
  } | null>(null);
  const quantityFor = (offering: DirectOrderOffering) =>
    quantities[offering.slug] ?? String(offering.minimumQuantity ?? 1);
  const modifiersFor = (offering: DirectOrderOffering) => [
    ...(groupOptions[offering.groupLabel ?? "Other"] ?? []),
    ...(remote && minigameModifiers(offering).some((m) => m.slug === "parsec")
      ? ["parsec"]
      : []),
  ];
  const selections: DirectOrderSelection[] = service.offerings
    .filter((o) => selected[o.slug])
    .map((o) => ({
      slug: o.slug,
      quantity: Number(quantityFor(o)),
      modifierSlugs: modifiersFor(o),
    }));
  let calculation: ReturnType<typeof calculateDirectOrderEstimate> | null =
    null;
  let validationError: string | null = null;
  if (selections.length) {
    try {
      calculation = calculateDirectOrderEstimate(service.offerings, selections);
    } catch (error) {
      validationError =
        error instanceof Error ? error.message : "Check your quantities.";
    }
  }
  const source = calculation
    ? { serviceId: service.id, selections, gameMode }
    : null;
  const quoteKey = source ? JSON.stringify(source) : "";
  useEffect(() => {
    if (!quoteKey) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/catalogue/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: quoteKey,
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok)
          throw new Error(payload.message ?? "Could not confirm the price.");
        if (!controller.signal.aborted)
          setQuote({ key: quoteKey, totalCents: payload.totalCents });
      } catch (error) {
        if (!controller.signal.aborted)
          setQuote({
            key: quoteKey,
            error:
              error instanceof Error
                ? error.message
                : "Could not confirm the price.",
          });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteKey]);
  const currentQuote = quote?.key === quoteKey ? quote : null;
  const ready = currentQuote?.totalCents != null && !validationError;
  const groups = useMemo(() => {
    const grouped = new Map<string, DirectOrderOffering[]>();
    for (const offering of service.offerings) {
      if (
        !`${offering.groupLabel} ${offering.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
        continue;
      const group = offering.groupLabel ?? "Other";
      grouped.set(group, [...(grouped.get(group) ?? []), offering]);
    }
    const result = [...grouped.entries()];
    const price = (items: DirectOrderOffering[]) =>
      Math.min(...items.map((o) => o.basePriceCents ?? Infinity));
    if (sort === "name-asc") result.sort(([a], [b]) => a.localeCompare(b));
    if (sort === "name-desc") result.sort(([a], [b]) => b.localeCompare(a));
    if (sort === "price-asc")
      result.sort(([, a], [, b]) => price(a) - price(b));
    if (sort === "price-desc")
      result.sort(([, a], [, b]) => price(b) - price(a));
    return result;
  }, [service.offerings, search, sort]);
  function toggleModifier(group: string, slug: string) {
    setGroupOptions((current) => {
      let options = current[group] ?? [];
      if (options.includes(slug))
        return { ...current, [group]: options.filter((s) => s !== slug) };
      if (slug.startsWith("under-"))
        options = options.filter((s) => !s.startsWith("under-"));
      if (slug.endsWith("combat-achievements"))
        options = options.filter((s) => !s.endsWith("combat-achievements"));
      return { ...current, [group]: [...options, slug] };
    });
  }
  return (
    <div className="reference-order-layout reference-order-minigames">
      <section className="store-panel reference-catalogue">
        <div className="minigames-toolbar">
          <label className="store-search">
            <Search size={18} />
            <input
              aria-label="Search minigames"
              placeholder="Find a minigame or reward…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="store-field">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Default</option>
              <option value="name-asc">Name, A to Z</option>
              <option value="name-desc">Name, Z to A</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>
        </div>
        <label className="minigames-remote">
          <input
            type="checkbox"
            checked={remote}
            onChange={(e) => setRemote(e.target.checked)}
          />{" "}
          Parsec remote access <span>+50%</span>
        </label>
        {!groups.length && (
          <p className="store-empty">
            No services match your search. Try another reward or minigame.
          </p>
        )}
        {groups.map(([group, offerings], index) => {
          const key = facetValue(offerings[0]!, "artwork") ?? "misc";
          const modifiers = minigameModifiers(offerings[0]!).filter(
            (m) => m.slug !== "parsec",
          );
          return (
            <details
              className="minigames-group"
              key={`${group}:${search}`}
              open={search ? true : index === 0 ? true : undefined}
            >
              <summary>
                <Image
                  src={`/artwork/minigames/${key}.webp`}
                  alt={`${group} rewards and equipment`}
                  width={80}
                  height={80}
                  sizes="80px"
                />
                <span>
                  <h2>{group}</h2>
                  <small>
                    {offerings.length}{" "}
                    {offerings.length === 1 ? "option" : "options"}
                  </small>
                </span>
                <strong>
                  From{" "}
                  {formatDirectOrderPrice(
                    Math.min(...offerings.map((o) => o.basePriceCents ?? 0)),
                  )}
                </strong>
              </summary>
              {!!modifiers.length && (
                <fieldset className="minigames-modifiers">
                  <legend>Optional adjustments</legend>
                  {modifiers.map((m) => (
                    <label key={m.slug}>
                      <input
                        type="checkbox"
                        checked={(groupOptions[group] ?? []).includes(m.slug)}
                        onChange={() => toggleModifier(group, m.slug)}
                      />
                      {m.label}{" "}
                      <span>
                        {m.bps >= 0 ? "+" : ""}
                        {m.bps / 100}%
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="minigames-options">
                {offerings.map((offering) => {
                  const quantity = quantityFor(offering);
                  const price = directOrderLinePrice(
                    offering,
                    Number(quantity) || offering.minimumQuantity || 1,
                    modifiersFor(offering),
                  ).amountCents;
                  return (
                    <article
                      key={offering.slug}
                      id={offering.slug}
                      className={`direct-order-card reference-gathering-card ${selected[offering.slug] ? "is-selected" : ""}`}
                    >
                      <h3>{offering.name}</h3>
                      <p>{offering.pricingUnit}</p>
                      <strong className="store-price">
                        {formatDirectOrderPrice(price)}
                      </strong>
                      <small>
                        <Clock3 size={13} />
                        {offering.estimatedDeliveryText ??
                          "Timing confirmed after review"}
                      </small>
                      <label className="store-field">
                        Amount
                        <input
                          aria-label={`Amount for ${group} ${offering.name}`}
                          type="number"
                          inputMode="numeric"
                          min={offering.minimumQuantity ?? 1}
                          max={offering.maximumQuantity ?? undefined}
                          value={quantity}
                          onChange={(e) =>
                            setQuantities((current) => ({
                              ...current,
                              [offering.slug]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="reference-primary-button"
                        aria-pressed={!!selected[offering.slug]}
                        onClick={() =>
                          setSelected((current) => ({
                            ...current,
                            [offering.slug]: !current[offering.slug],
                          }))
                        }
                      >
                        {selected[offering.slug]
                          ? "Selected ✓"
                          : "Select Service"}
                      </button>
                      <details className="store-details">
                        <summary>Requirements</summary>
                        {offering.requirements.map((r) => (
                          <p key={r.id}>
                            <strong>{r.title}:</strong> {r.description}
                            {r.customerGuidance && (
                              <span> {r.customerGuidance}</span>
                            )}
                          </p>
                        ))}
                      </details>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
      <aside className="reference-order-side">
        <section className="store-panel">
          <h2>
            <ShoppingCart size={23} /> Order Summary
          </h2>
          <label className="store-field">
            Account type
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
            >
              {service.gameModes.map((m) => (
                <option value={m.gameMode} key={m.gameMode}>
                  {m.gameMode.toLowerCase().replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <p>
            {selections.length} selected{" "}
            {selections.length === 1 ? "service" : "services"}
          </p>
          {calculation?.lines.map((line) => (
            <p key={line.slug}>
              {line.label}{" "}
              <strong>{formatDirectOrderPrice(line.amountCents)}</strong>
            </p>
          ))}
          <strong className="store-price">
            {formatDirectOrderPrice(
              currentQuote?.totalCents ?? calculation?.subtotalCents ?? 0,
            )}
          </strong>
          {source && !currentQuote && <p role="status">Confirming price…</p>}
          {(validationError || currentQuote?.error) && (
            <p role="alert">{validationError || currentQuote?.error}</p>
          )}
          <AddEstimateToCart
            kind="CATALOGUE_OFFERING_ESTIMATE"
            source={ready ? source : null}
          />
          <p className="minigames-review-note">
            Requirements, available supplies and delivery timing will be
            confirmed before starting. Additional preparation is quoted
            separately.
          </p>
        </section>
      </aside>
    </div>
  );
}
