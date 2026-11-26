export default function Button({
  children, onClick, variant = 'primary',
  disabled = false, size = 'md', type = 'button', fullWidth = false, style = {}
}) {
  let btnClass = 'btn';
  if (variant === 'primary') btnClass += ' btn-primary';
  if (variant === 'ghost' || variant === 'secondary') btnClass += ' btn-ghost';
  if (variant === 'danger') btnClass += ' btn-danger';
  if (size === 'sm') btnClass += ' btn-sm';
  if (fullWidth) btnClass += ' btn-full';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={btnClass}
      style={style}
    >
      {children}
    </button>
  );
}
