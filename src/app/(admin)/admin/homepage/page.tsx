import {
  Eye,
  ImageIcon,
  LayoutTemplate,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  archiveHomepageItemAction,
  saveHomepageItemAction,
  saveHomepageSectionAction,
  toggleHomepageItemAction,
} from "@/app/(admin)/admin/homepage/actions";
import { CatalogueNotice, fieldClass } from "@/components/catalogue-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCapability } from "@/lib/auth/guards";
import {
  homepagePlacements,
  homepagePriceModes,
  homepageSourceTypes,
  parseBulletPoints,
} from "@/lib/homepage/core";
import { getHomepageAdminData } from "@/lib/homepage/server";

export const metadata = { title: "Homepage Manager" };
export const dynamic = "force-dynamic";

type AdminData = Awaited<ReturnType<typeof getHomepageAdminData>>;
type HomepageAdminItem = AdminData["items"][number];

function dateTimeValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 16) : "";
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function SourceOptions({ data }: { data: AdminData }) {
  return (
    <>
      <option value="">No linked record / manual promotion</option>
      <optgroup label="Catalogue services">
        {data.sources.services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.category.name} / {service.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Products">
        {data.sources.products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.publicTitle}
          </option>
        ))}
      </optgroup>
      <optgroup label="Accounts">
        {data.sources.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.publicTitle}
          </option>
        ))}
      </optgroup>
      <optgroup label="Gold offers">
        {data.sources.gold.map((offer) => (
          <option key={offer.id} value={offer.id}>
            {offer.publicName}
          </option>
        ))}
      </optgroup>
      <optgroup label="Custom builds">
        {data.sources.customBuilds.map((build) => (
          <option key={build.id} value={build.id}>
            {build.publicName}
          </option>
        ))}
      </optgroup>
    </>
  );
}

function HomepageItemForm({
  data,
  item,
}: {
  data: AdminData;
  item?: HomepageAdminItem;
}) {
  const bullets = parseBulletPoints(item?.bulletPoints).join("\n");
  const localImage = item?.imagePath?.startsWith("/") ? item.imagePath : null;
  return (
    <form
      action={saveHomepageItemAction}
      encType="multipart/form-data"
      className="grid gap-5"
    >
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {item ? (
        <input
          type="hidden"
          name="concurrencyVersion"
          value={item.concurrencyVersion}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Homepage section
          <select
            className={`${fieldClass} mt-2`}
            name="placement"
            defaultValue={item?.placement ?? "FEATURED_SERVICE"}
          >
            {homepagePlacements.map((placement) => (
              <option key={placement} value={placement}>
                {label(placement)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Content source
          <select
            className={`${fieldClass} mt-2`}
            name="sourceType"
            defaultValue={item?.sourceType ?? "MANUAL_PROMO"}
          >
            {homepageSourceTypes.map((source) => (
              <option key={source} value={source}>
                {label(source)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Linked record
          <select
            className={`${fieldClass} mt-2`}
            name="linkedRecordId"
            defaultValue={item?.linkedRecordId ?? ""}
          >
            <SourceOptions data={data} />
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold xl:col-span-2">
          Title override
          <input
            className={`${fieldClass} mt-2`}
            name="titleOverride"
            defaultValue={item?.titleOverride ?? ""}
            maxLength={180}
            placeholder="Leave blank to use the linked record title"
          />
        </label>
        <label className="text-sm font-semibold">
          Category label
          <input
            className={`${fieldClass} mt-2`}
            name="categoryLabel"
            defaultValue={item?.categoryLabel ?? ""}
            maxLength={120}
          />
        </label>
        <label className="text-sm font-semibold">
          Badge
          <input
            className={`${fieldClass} mt-2`}
            name="badgeText"
            defaultValue={item?.badgeText ?? ""}
            maxLength={80}
            placeholder="Best Seller / Hot / New"
          />
          <input
            type="hidden"
            name="badgeStyle"
            value={item?.badgeStyle ?? "red"}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-semibold">
          Description override
          <textarea
            className={`${fieldClass} mt-2 min-h-28`}
            name="descriptionOverride"
            defaultValue={item?.descriptionOverride ?? ""}
            maxLength={500}
          />
        </label>
        <label className="text-sm font-semibold">
          Benefit bullets — one per line
          <textarea
            className={`${fieldClass} mt-2 min-h-28`}
            name="bulletPoints"
            defaultValue={bullets}
            maxLength={1000}
          />
        </label>
      </div>

      <div className="border-border bg-background/35 grid gap-5 border p-4 lg:grid-cols-[10rem_1fr]">
        <div className="border-border bg-surface-2 flex min-h-32 items-center justify-center overflow-hidden border">
          {localImage ? (
            <Image
              src={localImage}
              alt={item?.imageAltText ?? "Homepage artwork preview"}
              width={320}
              height={180}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon className="text-text-muted size-8" aria-hidden="true" />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Image path
            <input
              className={`${fieldClass} mt-2`}
              name="imagePath"
              defaultValue={item?.imagePath ?? ""}
              maxLength={500}
              placeholder="/uploads/homepage/example.webp"
            />
          </label>
          <label className="text-sm font-semibold">
            Replace artwork
            <input
              className={`${fieldClass} file:bg-primary mt-2 file:mr-3 file:border-0 file:px-3 file:py-2 file:font-bold file:text-white`}
              type="file"
              name="artwork"
              accept="image/jpeg,image/png,image/webp,image/avif"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Image alt text
            <input
              className={`${fieldClass} mt-2`}
              name="imageAltText"
              defaultValue={item?.imageAltText ?? ""}
              maxLength={240}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">
          CTA text
          <input
            className={`${fieldClass} mt-2`}
            name="ctaText"
            defaultValue={item?.ctaText ?? "View service"}
            maxLength={80}
          />
        </label>
        <label className="text-sm font-semibold">
          CTA URL
          <input
            className={`${fieldClass} mt-2`}
            name="ctaUrl"
            defaultValue={item?.ctaUrl ?? ""}
            maxLength={500}
            placeholder="/services"
          />
        </label>
        <label className="text-sm font-semibold">
          Price mode
          <select
            className={`${fieldClass} mt-2`}
            name="priceMode"
            defaultValue={item?.priceMode ?? "HIDE"}
          >
            {homepagePriceModes.map((mode) => (
              <option key={mode} value={mode}>
                {label(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Display order
          <input
            className={`${fieldClass} mt-2`}
            type="number"
            name="displayOrder"
            min={0}
            max={10000}
            defaultValue={item?.displayOrder ?? 100}
          />
        </label>
        <label className="text-sm font-semibold">
          Promotional price (USD)
          <input
            className={`${fieldClass} mt-2`}
            type="number"
            name="promotionalPrice"
            min={0}
            step="0.01"
            defaultValue={
              item?.promotionalPriceCents == null
                ? ""
                : (item.promotionalPriceCents / 100).toFixed(2)
            }
          />
        </label>
        <label className="text-sm font-semibold">
          Old price (USD)
          <input
            className={`${fieldClass} mt-2`}
            type="number"
            name="oldPrice"
            min={0}
            step="0.01"
            defaultValue={
              item?.oldPriceCents == null
                ? ""
                : (item.oldPriceCents / 100).toFixed(2)
            }
          />
        </label>
        <label className="text-sm font-semibold">
          Starts at
          <input
            className={`${fieldClass} mt-2`}
            type="datetime-local"
            name="startsAt"
            defaultValue={dateTimeValue(item?.startsAt)}
          />
        </label>
        <label className="text-sm font-semibold">
          Expires at
          <input
            className={`${fieldClass} mt-2`}
            type="datetime-local"
            name="expiresAt"
            defaultValue={dateTimeValue(item?.expiresAt)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={item?.isActive ?? true}
            />
            Active
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={item?.isFeatured ?? true}
            />
            Featured placement
          </label>
        </div>
        <Button type="submit">
          <Save className="size-4" aria-hidden="true" />
          {item ? "Save card" : "Add card"}
        </Button>
      </div>
    </form>
  );
}

export default async function HomepageManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; message?: string }>;
}) {
  await requireCapability("homepage.manage", "/admin/homepage");
  const [data, notice] = await Promise.all([
    getHomepageAdminData(),
    searchParams,
  ]);
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <Badge variant="success">Homepage CMS</Badge>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="display-type text-4xl sm:text-5xl">
            Homepage Manager
          </h1>
          <p className="text-text-secondary mt-3 max-w-3xl leading-7">
            Curate the storefront from real catalogue records or manual
            promotions, control visibility and ordering, and replace artwork
            without a code change.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/" target="_blank">
            <Eye className="size-4" aria-hidden="true" /> Preview homepage
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        <CatalogueNotice {...notice} />
      </div>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="text-primary size-5" aria-hidden="true" />
          <h2 className="display-type text-3xl">Section settings</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {data.sections.map((section) => (
            <form
              action={saveHomepageSectionAction}
              key={section.id}
              className="border-border bg-surface-1 grid gap-4 border p-5"
            >
              <input type="hidden" name="id" value={section.id} />
              <input
                type="hidden"
                name="concurrencyVersion"
                value={section.concurrencyVersion}
              />
              <label className="text-sm font-semibold">
                Section title
                <input
                  className={`${fieldClass} mt-2`}
                  name="title"
                  defaultValue={section.title}
                  maxLength={160}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold">
                  Item limit
                  <input
                    className={`${fieldClass} mt-2`}
                    type="number"
                    name="itemLimit"
                    min={1}
                    max={12}
                    defaultValue={section.itemLimit}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Order
                  <input
                    className={`${fieldClass} mt-2`}
                    type="number"
                    name="displayOrder"
                    min={0}
                    max={1000}
                    defaultValue={section.displayOrder}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={section.enabled}
                />{" "}
                Enabled
              </label>
              <Button type="submit" size="sm">
                Save section
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <Plus className="text-primary size-5" aria-hidden="true" />
          <h2 className="display-type text-3xl">Add promotional card</h2>
        </div>
        <div className="border-border bg-surface-1 mt-5 border p-5 sm:p-6">
          <HomepageItemForm data={data} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="display-type text-3xl">Current homepage cards</h2>
        <p className="text-text-muted mt-2 text-sm">
          {data.items.length} active or scheduled card records.
        </p>
        <div className="mt-5 grid gap-6">
          {data.items.map((item) => (
            <article
              key={item.id}
              className="border-border bg-surface-1 border p-5 sm:p-6"
            >
              <div className="border-border mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={item.isActive ? "success" : "warning"}>
                      {item.isActive ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="info">{label(item.placement)}</Badge>
                    <Badge>{label(item.sourceType)}</Badge>
                  </div>
                  <h3 className="display-type mt-3 text-2xl">
                    {item.titleOverride ?? "Linked record title"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleHomepageItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      type="hidden"
                      name="concurrencyVersion"
                      value={item.concurrencyVersion}
                    />
                    <input
                      type="hidden"
                      name="active"
                      value={item.isActive ? "false" : "true"}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      {item.isActive ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  <form action={archiveHomepageItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      type="hidden"
                      name="concurrencyVersion"
                      value={item.concurrencyVersion}
                    />
                    <Button type="submit" size="sm" variant="danger">
                      <Trash2 className="size-3.5" aria-hidden="true" /> Archive
                    </Button>
                  </form>
                </div>
              </div>
              <HomepageItemForm data={data} item={item} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
