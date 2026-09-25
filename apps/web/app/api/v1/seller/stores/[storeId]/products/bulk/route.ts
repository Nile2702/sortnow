import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createProduct, stores } from "../../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../../lib/auth/require-seller";
import { validateProductInput } from "../../../../../../../../lib/validate-product";

// Synchronous stand-in for the async `bulk_import_jobs` flow in
// database/schema.sql - real bulk imports (thousands of rows) go through a
// queued worker; this demo's rows are few enough to just create inline.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const { rows } = await req.json();
  if (!Array.isArray(rows)) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  rows.forEach((row, i) => {
    try {
      const candidate = {
        title: row.title,
        description: row.description || undefined,
        fabric: row.fabric || undefined,
        gender: row.gender || "women",
        subCategory: row.subCategory || "Other",
        basePrice: row.basePrice !== undefined && row.basePrice !== "" ? Number(row.basePrice) : undefined,
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
        sizes: row.sizes ? String(row.sizes).split(";").map((s: string) => s.trim()).filter(Boolean) : undefined,
        stockRemaining: row.stockRemaining ? Number(row.stockRemaining) : undefined,
        productCode: row.productCode || undefined,
      };

      const { errors: rowErrors, data } = validateProductInput(candidate, true);
      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, message: rowErrors.join("; ") });
        return;
      }

      createProduct(store.id, data);
      successCount++;
    } catch (err) {
      errors.push({ row: i + 1, message: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  revalidateTag(`products:${store.id}`);
  revalidatePath(`/store/${store.slug}`);

  return NextResponse.json({ totalRows: rows.length, successCount, errorCount: errors.length, errors });
}
