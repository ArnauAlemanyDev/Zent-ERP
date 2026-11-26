export default function EmptyState({ icon = '◌', title, description, action }) {
  return (
    <div className="state-box" style={{ flexDirection: 'column', gap: 8, padding: '40px 24px', margin: '20px 0' }}>
      <div style={{ fontSize: 36, color: 'var(--text-dim)', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-sub)', maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>{description}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
