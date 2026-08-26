import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maximumBytes = 5 * 1024 * 1024;
const extensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
]);

function hasRasterSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    );
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    const brand = bytes.toString("ascii", 8, 12);
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(brand)
    );
  }
  return false;
}

export async function saveHomepageArtwork(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = extensions.get(file.type);
  if (!extension)
    throw new Error("Artwork must be a JPEG, PNG, WebP or AVIF image.");
  if (file.size > maximumBytes)
    throw new Error("Artwork must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasRasterSignature(bytes, file.type))
    throw new Error("Artwork contents do not match the selected image type.");
  const directory = path.join(process.cwd(), "public", "uploads", "homepage");
  await mkdir(directory, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return `/uploads/homepage/${filename}`;
}
