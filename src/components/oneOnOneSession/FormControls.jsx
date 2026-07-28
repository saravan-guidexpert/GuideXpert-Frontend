export const neoInputClass =
  'w-full rounded-xl border border-[#d8dce6] bg-white px-3.5 py-2.5 text-sm font-medium text-[#1a1a1a] outline-none transition placeholder:text-[#9aa0ae] focus:border-[#f27921] focus:ring-2 focus:ring-[#f27921]/20';

export const neoLabelClass =
  'mb-1.5 block text-[13px] font-semibold tracking-tight text-[#041e30]';

const inputError = 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200';

export function FormLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className={neoLabelClass}>
      {children}
      {required ? <span className="text-[#f27921]"> *</span> : null}
    </label>
  );
}

export function FormInput({ id, error, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`${neoInputClass} ${error ? inputError : ''} ${className}`.trim()}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    />
  );
}

export function FormSelect({ id, error, placeholder = 'Select…', options, className = '', ...props }) {
  return (
    <select
      id={id}
      className={`${neoInputClass} cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 ${error ? inputError : ''} ${className}`.trim()}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function FormTextarea({ id, error, className = '', ...props }) {
  return (
    <textarea
      id={id}
      rows={4}
      className={`${neoInputClass} resize-y min-h-[100px] ${error ? inputError : ''} ${className}`.trim()}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    />
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  error,
  name,
  className = '',
  required = false,
}) {
  const normalizedOptions = options
    .map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: option };
      }
      return {
        value: option?.value || '',
        label: option?.label || option?.value || '',
      };
    })
    .filter((option) => option.value);

  return (
    <div className={`sm:col-span-1 ${className}`.trim()}>
      <p className={neoLabelClass}>
        {label}
        {required ? <span className="text-[#f27921]"> *</span> : null}
      </p>
      <div
        className={`rounded-xl border bg-[#f8f9fc] p-2.5 ${
          error ? 'border-red-400' : 'border-[#e5e7eb]'
        }`}
        role="radiogroup"
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {normalizedOptions.map((option) => {
            const id = `${name || label}-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={id}
                className="flex min-w-[140px] flex-1 cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a1a] transition has-[:checked]:border-[#f27921]/45 has-[:checked]:bg-[#fff4ed] has-[:checked]:text-[#c45a0c]"
              >
                <input
                  id={id}
                  name={name}
                  type="radio"
                  checked={value === option.value}
                  onChange={() => onChange(option.value)}
                  className="h-4 w-4 border-[#d8dce6] text-[#f27921] accent-[#f27921]"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function NeoField({ label, children, error, className = '', required = false }) {
  return (
    <div className={`sm:col-span-1 ${className}`.trim()}>
      <p className={neoLabelClass}>
        {label}
        {required ? <span className="text-[#f27921]"> *</span> : null}
      </p>
      {children}
      <FieldError message={error} />
    </div>
  );
}
