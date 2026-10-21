import { useEffect, useRef } from 'react';

export default function ConsultancyTabs({ tabs, active, onChange }) {
  const listRef = useRef(null);

  useEffect(() => {
    const button = listRef.current?.querySelector('[aria-selected="true"]');
    button?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [active]);

  function onKeyDown(event) {
    const index = tabs.findIndex(([key]) => key === active);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const key = tabs[next][0];
    onChange(key);
    listRef.current?.querySelector(`[data-tab="${key}"]`)?.focus();
  }

  return (
    <div className="gx-ov-tabs" role="tablist" aria-label="Consultancy sections" ref={listRef} onKeyDown={onKeyDown}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          data-tab={key}
          id={`gx-tab-${key}`}
          aria-selected={active === key}
          aria-controls={`gx-panel-${key}`}
          tabIndex={active === key ? 0 : -1}
          className={active === key ? 'is-active' : ''}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
