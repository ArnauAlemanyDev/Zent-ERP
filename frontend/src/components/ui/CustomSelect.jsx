import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    const value = opt.value === null || opt.value === undefined ? '' : String(opt.value);
    return { label: opt.label ?? value, value };
  });
}

export default function CustomSelect({
  options = [],
  value = '',
  onChange,
  placeholder = '',
  customOptionLabel,
  customValue,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || placeholder || '';

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target)) return;
      if (event.target.closest('.custom-select-options')) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (selectedValue) => {
    if (disabled) return;
    if (typeof onChange === 'function') onChange(selectedValue);
    setIsOpen(false);
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen((open) => !open);
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderOption = (option, isSelected) => (
    <div
      key={option.value}
      className={`custom-select-option ${isSelected ? 'selected' : ''}`}
      onClick={() => handleSelect(option.value)}
      role="option"
      aria-selected={isSelected}
    >
      <span>{option.label}</span>
      {isSelected && (
        <span className="check-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );

  const optionsList = (
    <div
      className="custom-select-options"
      style={{ position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
    >
      <div className="options-scroll">
        {normalizedOptions.map((option) => renderOption(option, option.value === value))}
        {customOptionLabel && customValue !== undefined && (
          <div
            className={`custom-select-option custom-action ${customValue === value ? 'selected' : ''}`}
            onClick={() => handleSelect(customValue)}
            role="option"
            aria-selected={customValue === value}
          >
            <span>{customOptionLabel}</span>
            {customValue === value && (
              <span className="check-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`custom-select-container ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      <div
        className={`custom-select-trigger${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`selected-value ${!value ? 'placeholder' : ''}`}>{displayLabel}</span>
        <span className="chevron-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(optionsList, document.body)}
    </div>
  );
}
