// Shared inline form-error banner - previously reimplemented separately (and
// slightly differently styled) in app/account/page.tsx and app/reserve/page.tsx.
export function ErrorBanner({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <p
      role="alert"
      style={{
        fontSize: 13,
        color: "var(--sio-error)",
        background: "var(--sio-error-bg)",
        border: "1px solid var(--sio-error-border)",
        borderRadius: 10,
        padding: "10px 12px",
        margin: 0,
        ...style,
      }}
    >
      {text}
    </p>
  );
}
