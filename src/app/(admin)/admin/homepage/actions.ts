"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/guards";
import {
  archiveHomepageItem,
  homepageErrorMessage,
  saveHomepageItem,
  saveHomepageSection,
  setHomepageItemActive,
} from "@/lib/homepage/server";
import { saveHomepageArtwork } from "@/lib/homepage/upload";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9-]+$/i);
const versionSchema = z.coerce.number().int().min(1);

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function optionalDollars(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Enter a valid price.");
  return Math.round(amount * 100);
}

function destination(state: "saved" | "error", message: string) {
  return `/admin/homepage?${new URLSearchParams({ state, message }).toString()}`;
}

export async function saveHomepageSectionAction(formData: FormData) {
  const session = await requireCapability("homepage.manage", "/admin/homepage");
  try {
    await saveHomepageSection({
      actorId: session.user.id,
      input: {
        id: formData.get("id"),
        title: formData.get("title"),
        enabled: checked(formData, "enabled"),
        itemLimit: formData.get("itemLimit"),
        displayOrder: formData.get("displayOrder"),
        concurrencyVersion: formData.get("concurrencyVersion"),
      },
    });
  } catch (error) {
    redirect(destination("error", homepageErrorMessage(error)));
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect(destination("saved", "Homepage section saved."));
}

export async function saveHomepageItemAction(formData: FormData) {
  const session = await requireCapability("homepage.manage", "/admin/homepage");
  try {
    const uploadedPath = await saveHomepageArtwork(
      formData.get("artwork") instanceof File
        ? (formData.get("artwork") as File)
        : null,
    );
    await saveHomepageItem({
      actorId: session.user.id,
      input: {
        id: formData.get("id") || undefined,
        placement: formData.get("placement"),
        sourceType: formData.get("sourceType"),
        linkedRecordId: formData.get("linkedRecordId") || undefined,
        titleOverride: formData.get("titleOverride") || undefined,
        descriptionOverride: formData.get("descriptionOverride") || undefined,
        badgeText: formData.get("badgeText") || undefined,
        badgeStyle: formData.get("badgeStyle") || undefined,
        bulletPoints: formData.get("bulletPoints") || undefined,
        imagePath: uploadedPath ?? formData.get("imagePath") ?? undefined,
        imageAltText: formData.get("imageAltText") || undefined,
        ctaText: formData.get("ctaText") || undefined,
        ctaUrl: formData.get("ctaUrl") || undefined,
        priceMode: formData.get("priceMode"),
        promotionalPriceCents: optionalDollars(
          formData.get("promotionalPrice"),
        ),
        oldPriceCents: optionalDollars(formData.get("oldPrice")),
        categoryLabel: formData.get("categoryLabel") || undefined,
        displayOrder: formData.get("displayOrder"),
        isActive: checked(formData, "isActive"),
        isFeatured: checked(formData, "isFeatured"),
        startsAt: formData.get("startsAt") || undefined,
        expiresAt: formData.get("expiresAt") || undefined,
        concurrencyVersion: formData.get("concurrencyVersion") || undefined,
      },
    });
  } catch (error) {
    redirect(destination("error", homepageErrorMessage(error)));
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect(destination("saved", "Homepage card saved."));
}

export async function toggleHomepageItemAction(formData: FormData) {
  const session = await requireCapability("homepage.manage", "/admin/homepage");
  try {
    await setHomepageItemActive({
      id: idSchema.parse(formData.get("id")),
      active: formData.get("active") === "true",
      actorId: session.user.id,
      expectedVersion: versionSchema.parse(formData.get("concurrencyVersion")),
    });
  } catch (error) {
    redirect(destination("error", homepageErrorMessage(error)));
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect(destination("saved", "Homepage card visibility updated."));
}

export async function archiveHomepageItemAction(formData: FormData) {
  const session = await requireCapability("homepage.manage", "/admin/homepage");
  try {
    await archiveHomepageItem({
      id: idSchema.parse(formData.get("id")),
      actorId: session.user.id,
      expectedVersion: versionSchema.parse(formData.get("concurrencyVersion")),
    });
  } catch (error) {
    redirect(destination("error", homepageErrorMessage(error)));
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect(destination("saved", "Homepage card archived."));
}
