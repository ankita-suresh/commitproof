import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Props = { value: string; onChange: (timezone: string) => void; disabled?: boolean };

function availableZones(current: string): string[] {
  const api = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  let zones: string[] = [];
  try { zones = api.supportedValuesOf?.('timeZone') || []; } catch { /* use fallback */ }
  if (!zones.length) zones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Kolkata', 'Asia/Calcutta',
    'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
  ];
  return [...new Set(['UTC', current, ...zones])].filter(zone => {
    if (!zone) return false;
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; }
    catch { return false; }
  }).sort((a, b) => a.localeCompare(b));
}

const label = (zone: string) => zone.replaceAll('_', ' ').replaceAll('/', ' / ');
const searchText = (text: string) => text.toLowerCase().replace(/[_/]/g, ' ');

export default function TimezoneSelect({ value, onChange, disabled = false }: Props) {
  const id = useId();
  const listId = `${id}-options`;
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const zones = useMemo(() => availableZones(value), [value]);
  const results = useMemo(() => {
    const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
    return zones.filter(zone => {
      let text = searchText(zone);
      // Search aliases while preserving the actual supported identifier.
      if (/kolkata|calcutta/i.test(zone)) text += ' india kolkata calcutta';
      if (zone === 'UTC') text += ' coordinated universal time';
      return terms.every(term => text.includes(term));
    });
  }, [zones, query]);
  const visible = results.slice(0, 80);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false); setQuery(value);
      }
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [value]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);
  useEffect(() => { if (disabled) { setOpen(false); setQuery(value); } }, [disabled, value]);

  function choose(zone: string) {
    onChange(zone); setQuery(zone); setOpen(false); setActive(0);
  }

  return <div ref={root} style={{ position: 'relative', minWidth: 0 }}>
    <label htmlFor={id} style={{ display: 'block', fontSize: 8, letterSpacing: '.8px', color: '#92a080', textTransform: 'uppercase' }}>Timezone</label>
    <div style={{ position: 'relative' }}>
      <input
        ref={input} id={id} value={query} disabled={disabled}
        role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={listId} aria-activedescendant={open && visible[active] ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-hint`} autoComplete="off" spellCheck={false}
        placeholder={value || 'Search a city or region'}
        onFocus={() => { setQuery(''); setOpen(true); setActive(0); }}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onBlur={() => { setOpen(false); setQuery(value); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) { setQuery(''); setOpen(true); setActive(0); }
            else setActive(index => Math.min(index + 1, visible.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) { setQuery(''); setOpen(true); setActive(0); }
            else setActive(index => Math.max(0, index - 1));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault(); if (visible[active]) choose(visible[active]);
          } else if (event.key === 'Escape') {
            event.preventDefault(); setOpen(false); setQuery(value);
          }
        }}
        style={{ display: 'block', width: '100%', border: `1px solid ${open ? '#9db98a' : '#e2e8db'}`, borderRadius: 6, padding: '9px 28px 9px 10px', background: '#fafcf7', color: '#6e835d', fontSize: 11, marginTop: 7 }}
      />
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 9, color: '#98aa86', pointerEvents: 'none', fontSize: 11 }}>⌄</span>
    </div>
    <small id={`${id}-hint`} style={{ display: 'block', marginTop: 6, fontSize: 8, color: '#9aa98a', lineHeight: 1.5 }}>Search a city or region, then choose a match.</small>
    {open && <div style={{ position: 'absolute', zIndex: 40, top: 60, left: 0, width: 'max(100%, 240px)', maxWidth: 'min(340px, 75vw)', background: '#fff', border: '1px solid #d9e5cb', borderRadius: 9, boxShadow: '0 12px 28px #243a2520', overflow: 'hidden' }}>
      <div style={{ fontSize: 9, color: '#91a17f', padding: '10px 12px', background: '#f6f9f1', borderBottom: '1px solid #edf2e5' }}>
        {results.length ? `${results.length} matching timezones` : 'No matching timezones'}
      </div>
      <ul id={listId} role="listbox" aria-label="Timezones" style={{ listStyle: 'none', margin: 0, padding: 5, maxHeight: 230, overflowY: 'auto' }}>
        {visible.map((zone, index) => <li
          id={`${id}-option-${index}`} key={zone} role="option"
          aria-selected={zone === value}
          onPointerDown={event => event.preventDefault()}
          onMouseMove={() => setActive(index)}
          onClick={() => choose(zone)}
          style={{ padding: '10px 9px', borderRadius: 5, cursor: 'pointer', fontSize: 11, color: '#607c4e', background: index === active ? '#eef5e5' : 'transparent', display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
          <span style={{ flex: 1 }}>{label(zone)}</span>
          {zone === value && <span aria-hidden="true" style={{ color: '#6d9651' }}>✓</span>}
        </li>)}
      </ul>
      {!visible.length && <p style={{ padding: '10px 14px', fontSize: 10, color: '#9aa98a', lineHeight: 1.6, margin: 0 }}>Try “New York”, “London”, “India”, or “UTC”. Your selected timezone has not changed.</p>}
      {results.length > visible.length && <p style={{ margin: 0, padding: '9px 12px', fontSize: 9, color: '#9aa98a', borderTop: '1px solid #edf2e5' }}>Type more to narrow the list.</p>}
    </div>}
  </div>;
}
