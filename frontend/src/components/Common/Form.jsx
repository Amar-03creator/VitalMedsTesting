import { InlineSpinner } from './Loading.jsx';

export function FormField({ label, name, type = 'text', value, onChange, onBlur, error, placeholder, required, disabled, helpText, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input-field ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${disabled ? 'bg-gray-50' : ''}`}
      />
      {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function FormSelect({ label, name, value, onChange, onBlur, error, options = [], placeholder, required, disabled, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={`input-field ${error ? 'border-red-400' : ''} ${disabled ? 'bg-gray-50' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function FormTextarea({ label, name, value, onChange, onBlur, error, placeholder, required, disabled, rows = 3, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`input-field resize-none ${error ? 'border-red-400' : ''} ${disabled ? 'bg-gray-50' : ''}`}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function FormCheckbox({ label, name, checked, onChange, disabled, className = '' }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''} ${className}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked ?? false}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export function SubmitButton({ loading = false, children = 'Submit', className = '', disabled, type = 'submit', onClick, variant = 'primary' }) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`btn ${variants[variant]} ${className}`}
    >
      {loading && <InlineSpinner size="sm" color="white" />}
      {children}
    </button>
  );
}

export function FormDivider({ label }) {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      {label && (
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">{label}</span>
        </div>
      )}
    </div>
  );
}
