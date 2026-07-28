import { useMemo } from 'react';
import { FieldError, neoLabelClass } from './FormControls';

function parseSlotOption(option) {
  if (typeof option === 'string') {
    return { value: option, dateLabel: option, timeLabel: option, slotDate: '' };
  }
  const label = option?.label || option?.value || '';
  const parts = String(label).split('•').map((s) => s.trim());
  return {
    value: option?.value || '',
    dateLabel: parts[0] || label,
    timeLabel: option?.timeLabel || parts[1] || label,
    slotDate: option?.slotDate || '',
  };
}

function groupSlotsByDate(options) {
  const groups = [];
  const indexByDate = new Map();

  for (const raw of options) {
    const slot = parseSlotOption(raw);
    if (!slot.value) continue;

    const key = slot.slotDate || slot.dateLabel;
    if (!indexByDate.has(key)) {
      indexByDate.set(key, groups.length);
      groups.push({ key, dateLabel: slot.dateLabel, slots: [] });
    }
    groups[indexByDate.get(key)].slots.push(slot);
  }

  return groups;
}

export default function SessionSlotPicker({
  label,
  options = [],
  value,
  onChange,
  error,
  name = 'preferredTimeSlot',
  required = false,
}) {
  const dayGroups = useMemo(() => groupSlotsByDate(options), [options]);

  return (
    <div className="sm:col-span-2">
      <p className={neoLabelClass} id={`${name}-label`}>
        {label}
        {required ? <span className="text-[#f27921]"> *</span> : null}
      </p>
      <div
        className={`rounded-xl border bg-[#f8f9fc] p-3 sm:p-4 ${
          error ? 'border-red-400' : 'border-[#e5e7eb]'
        }`}
        role="radiogroup"
        aria-required={required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-labelledby={`${name}-label`}
      >
        <div className="space-y-5">
          {dayGroups.map((day) => (
            <div key={day.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
                {day.dateLabel}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {day.slots.map((slot) => {
                  const selected = value === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      name={name}
                      aria-pressed={selected}
                      onClick={() => onChange(slot.value)}
                      className={`min-h-[56px] rounded-xl border px-2 py-2.5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f27921]/35 ${
                        selected
                          ? 'border-[#f27921] bg-[#fff4ed] text-[#c45a0c] shadow-[0_6px_16px_-12px_rgba(242,121,33,0.55)]'
                          : 'border-[#e5e7eb] bg-white text-[#041e30] hover:border-[#f27921]/40 hover:bg-[#fffaf6]'
                      }`}
                    >
                      <span className="block text-xs font-semibold leading-tight tracking-wide">
                        {slot.timeLabel}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-[#8a94a0]">
                        3 hrs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}
