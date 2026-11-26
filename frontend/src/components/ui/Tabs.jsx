export default function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="tabs-nav">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: isActive ? 'var(--accent)' : 'var(--elevated)',
                color: isActive ? '#fff' : 'var(--text-dim)',
                padding: '1px 6px', borderRadius: 10,
                fontFamily: 'var(--font-mono)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
