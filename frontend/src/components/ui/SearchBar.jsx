export default function SearchBar({ value, onChange, placeholder = 'Buscar…', width = 260 }) {
  return (
    <div style={{ position: 'relative', width }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: 14 }}>⌕</span>
      <input
        className="input-search"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', paddingLeft: 32, paddingRight: value ? 28 : 14 }}
      />
      {value && (
        <button onClick={() => onChange('')} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'var(--text-dim)',
          cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
}
