import { useRef } from 'react';
import { applyOtpBackspace, applyOtpInput, applyOtpPaste } from '../../utils/jeeMockTestOtpEntry';

export default function OtpBoxes({ digits, onDigits, disabled, invalid }) {
  const refs = useRef([]);

  function focusAt(index) {
    const input = refs.current[Math.max(0, Math.min(5, index))];
    if (input) input.focus();
  }

  function commit(next) {
    onDigits(next.digits);
    window.requestAnimationFrame(() => focusAt(next.focusIndex));
  }

  return (
    <div
      className="grid grid-cols-6 gap-2"
      role="group"
      aria-label="One-time code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of 6`}
          aria-invalid={invalid || undefined}
          className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center text-[1.25rem] font-semibold text-[#041e30] outline-none transition focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/15 disabled:bg-[#f3f4f6] ${
            invalid ? 'border-red-400' : 'border-[#d8dce6]'
          }`}
          onChange={(event) => commit(applyOtpInput(digits, index, event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.preventDefault();
              commit(applyOtpBackspace(digits, index));
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              focusAt(index - 1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              focusAt(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            commit(applyOtpPaste(event.clipboardData.getData('text')));
          }}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
