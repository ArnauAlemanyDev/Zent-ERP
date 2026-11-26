import CustomSelect from './CustomSelect';

export default function Input({
  label, value, onChange, placeholder = '',
  type = 'text', required = false, disabled = false,
  hint, error, as = 'input', options = [], rows = 3,
}) {
  const renderLabel = () => (
    label && (
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
    )
  );

  return (
    <div className="form-group">
      {renderLabel()}

      {as === 'textarea' ? (
        <textarea
          value={value} onChange={onChange} placeholder={placeholder}
          disabled={disabled} rows={rows}
        />
      ) : as === 'select' ? (
        <CustomSelect
          options={options}
          value={value}
          onChange={(selectedValue) => onChange?.({ target: { value: selectedValue } })}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} required={required} disabled={disabled}
        />
      )}

      {hint && <span className="form-hint">{hint}</span>}
      {error && <span className="text-danger" style={{ fontSize: 12 }}>{error}</span>}
    </div>
  );
}
