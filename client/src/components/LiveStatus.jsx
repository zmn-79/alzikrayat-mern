// Small pill that shows whether the live (WebSocket) connection is working.
const LABELS = { live: 'Live', connecting: 'Connecting…', reconnecting: 'Reconnecting…' };

export default function LiveStatus({ status }) {
  const label = LABELS[status] || LABELS.connecting;
  const cls = status === 'live' ? 'is-live' : 'is-wait';
  return (
    <span className={`live-status ${cls}`} role="status" aria-live="polite"
      title={status === 'live' ? 'New comments appear instantly' : 'Live updates are paused; the page still works'}>
      <span className="live-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
