"use client";

import { useState } from "react";
import { colorToSwatch } from "../lib/color-swatches";

export interface ProductFacets {
  subCategories: { value: string; count: number }[];
  stores: { id: string; name: string; count: number }[];
  colors: { value: string; count: number }[];
  discountTiers: { minDiscount: number; count: number }[];
  priceRange: { min: number; max: number };
}

interface Props {
  genderLabel: string;
  facets: ProductFacets | null;
  selectedSubCategories: string[];
  onToggleSubCategory: (value: string) => void;
  selectedStoreIds: string[];
  onToggleStore: (id: string) => void;
  selectedColors: string[];
  onToggleColor: (value: string) => void;
  priceRange: [number, number] | null;
  onPriceRangeChange: (range: [number, number] | null) => void;
  minDiscount: number | undefined;
  onMinDiscountChange: (value: number | undefined) => void;
}

const VISIBLE_COUNT = 8;

export function CategoryFilterSidebar({
  genderLabel,
  facets,
  selectedSubCategories,
  onToggleSubCategory,
  selectedStoreIds,
  onToggleStore,
  selectedColors,
  onToggleColor,
  priceRange,
  onPriceRangeChange,
  minDiscount,
  onMinDiscountChange,
}: Props) {
  if (!facets) {
    return (
      <div className="sio-card" style={{ background: "#fff", padding: 16, borderRadius: 16, border: "1px solid var(--sio-cream)" }}>
        <div className="sio-skeleton" style={{ height: 300, borderRadius: 10 }} />
      </div>
    );
  }

  const bounds = facets.priceRange;
  const [lo, hi] = priceRange ?? [bounds.min, bounds.max];

  return (
    <div className="sio-card" style={{ background: "#fff", padding: 16, borderRadius: 16, border: "1px solid var(--sio-cream)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-muted)" }}>Filters</div>

      <FacetSection title="Category">
        <CheckboxList
          options={facets.subCategories.map((c) => ({ value: c.value, label: c.value, count: c.count }))}
          selected={selectedSubCategories}
          onToggle={onToggleSubCategory}
        />
      </FacetSection>

      <FacetSection title="Store">
        <CheckboxList
          options={facets.stores.map((s) => ({ value: s.id, label: s.name, count: s.count }))}
          selected={selectedStoreIds}
          onToggle={onToggleStore}
        />
      </FacetSection>

      <FacetSection title="Price">
        {bounds.max > bounds.min ? (
          <PriceRangeSlider bounds={bounds} value={[lo, hi]} onChange={(range) => onPriceRangeChange(range)} />
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--sio-muted)" }}>No price range to filter.</p>
        )}
      </FacetSection>

      <FacetSection title="Color">
        <CheckboxList
          options={facets.colors.map((c) => ({ value: c.value, label: c.value, count: c.count, swatch: colorToSwatch(c.value) }))}
          selected={selectedColors}
          onToggle={onToggleColor}
        />
      </FacetSection>

      <FacetSection title="Discount Range" last>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {minDiscount != null && (
            <button
              type="button"
              onClick={() => onMinDiscountChange(undefined)}
              style={{ background: "none", border: "none", color: "var(--sio-filter-accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: "6px 10px" }}
            >
              Clear
            </button>
          )}
          {facets.discountTiers
            .filter((t) => t.count > 0 || t.minDiscount === minDiscount)
            .map((t) => (
              <label
                key={t.minDiscount}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 13.5, cursor: "pointer", color: "var(--sio-ink)" }}
              >
                <input
                  type="radio"
                  name="minDiscount"
                  checked={minDiscount === t.minDiscount}
                  onChange={() => onMinDiscountChange(t.minDiscount)}
                />
                {t.minDiscount}% and above
                <span style={{ color: "var(--sio-muted)", fontSize: 12 }}>({t.count})</span>
              </label>
            ))}
        </div>
      </FacetSection>
    </div>
  );
}

function FacetSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--sio-cream)", padding: "14px 0" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--sio-ink)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function CheckboxList({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string; count: number; swatch?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) return <p style={{ fontSize: 12.5, color: "var(--sio-muted)" }}>No options available.</p>;
  const visible = expanded ? options : options.slice(0, VISIBLE_COUNT);
  const remaining = options.length - visible.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {visible.map((opt) => (
        <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 13.5, cursor: "pointer", color: "var(--sio-ink)" }}>
          <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => onToggle(opt.value)} />
          {opt.swatch && (
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: opt.swatch, border: "1px solid var(--sio-line)", flexShrink: 0 }} />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
          <span style={{ color: "var(--sio-muted)", fontSize: 12, marginLeft: "auto", paddingLeft: 6 }}>({opt.count})</span>
        </label>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{ background: "none", border: "none", color: "var(--sio-filter-accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: "6px 10px" }}
        >
          + {remaining} more
        </button>
      )}
      {expanded && options.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: "6px 10px" }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

// Two overlapping native range inputs sharing one visual track - the
// standard lightweight way to build a dual-handle slider without a
// dependency. Each input only ever controls its own handle; clamping (min
// can't pass max and vice versa) happens in the onChange handlers below
// rather than relying on the browser, which doesn't coordinate two
// independent inputs on its own.
function PriceRangeSlider({
  bounds,
  value,
  onChange,
}: {
  bounds: { min: number; max: number };
  value: [number, number];
  onChange: (range: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const step = Math.max(1, Math.round((bounds.max - bounds.min) / 100));
  const pct = (v: number) => ((v - bounds.min) / (bounds.max - bounds.min)) * 100;

  return (
    <div style={{ padding: "4px 6px 0" }}>
      <div style={{ position: "relative", height: 32 }}>
        <div style={{ position: "absolute", top: 14, left: 0, right: 0, height: 4, borderRadius: 999, background: "var(--sio-line)" }} />
        <div
          style={{
            position: "absolute",
            top: 14,
            height: 4,
            borderRadius: 999,
            background: "var(--sio-filter-accent)",
            left: `${pct(lo)}%`,
            right: `${100 - pct(hi)}%`,
          }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="sio-range-thumb"
          style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%", margin: 0, background: "none", pointerEvents: "none" }}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="sio-range-thumb"
          style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%", margin: 0, background: "none", pointerEvents: "none" }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "var(--sio-ink)", marginTop: 2 }}>
        <span>₹{lo.toLocaleString("en-IN")}</span>
        <span>
          ₹{hi.toLocaleString("en-IN")}
          {hi >= bounds.max ? "+" : ""}
        </span>
      </div>
    </div>
  );
}
