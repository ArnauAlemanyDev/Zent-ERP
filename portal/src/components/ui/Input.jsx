import CustomSelect from './CustomSelect';

export default function Input({ label, as = 'input', options = [], ...props }) {
  const Component = as;

  return (
    <div className="form-group">
      {label && <label>{label}{props.required && <span className="required">*</span>}</label>}

      {as === 'input' ? (
        <input {...props} />
      ) : as === 'select' ? (
        <CustomSelect
          options={options}
          value={props.value}
          onChange={(selectedValue) => props.onChange?.({ target: { value: selectedValue } })}
          placeholder={props.placeholder}
          disabled={props.disabled}
        />
      ) : (
        <Component {...props}>
          {as === 'select' && options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {props.children}
        </Component>
      )}
    </div>
  );
}
