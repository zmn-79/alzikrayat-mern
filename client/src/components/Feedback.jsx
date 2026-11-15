export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-block" role="status">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** type: "error" | "success" | "info". `messages` may be a string or an array. */
export function Alert({ type = 'error', messages, children }) {
  const list = Array.isArray(messages) ? messages : messages ? [messages] : [];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {list.length > 1 ? <ul>{list.map((m) => <li key={m}>{m}</li>)}</ul> : list[0]}
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">📷</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
