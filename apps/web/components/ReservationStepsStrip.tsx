import { ClipboardIcon, CheckIcon, WalkIcon, ArrowRightIcon } from "./icons";

const STEPS = [
  { icon: ClipboardIcon, label: "Reserve", detail: "Pick your size online, free" },
  { icon: CheckIcon, label: "Store confirms", detail: "The shop holds it for you" },
  { icon: WalkIcon, label: "Visit & try", detail: "Pay only if you keep it" },
];

// The core "how this works" explainer - reservation is not a familiar
// e-commerce pattern (no checkout, no shipping, no online payment), so this
// renders on both the homepage (before anyone has picked a product) and the
// product page (right before they reserve) rather than relying on either
// page to explain it in prose.
export function ReservationStepsStrip() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        background: "#fff",
        border: "1px solid var(--sio-cream)",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      {STEPS.map((step, i) => (
        <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--sio-cream)",
                color: "var(--sio-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <step.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{step.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--sio-muted)" }}>{step.detail}</div>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <span style={{ color: "var(--sio-line)", display: "flex", marginLeft: 4 }} aria-hidden="true">
              <ArrowRightIcon size={14} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
