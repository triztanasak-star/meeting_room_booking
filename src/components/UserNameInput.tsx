import { useRef, useState } from 'react';
import type { User } from '../lib/db';
import UserAvatar from './UserAvatar';

export default function UserNameInput({
  value,
  onChange,
  users,
  placeholder,
  multiple = false,
}: {
  value: string;
  onChange: (val: string) => void;
  users: User[];
  placeholder?: string;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segments = (multiple ? value.split(',') : [value]);
  const lastRaw = segments[segments.length - 1];
  const last = lastRaw.trim().toLowerCase();
  const chosen = segments
    .slice(0, -1)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const suggestions = users
    .filter((u) => {
      const name = (u.name ?? u.email ?? '').trim();
      if (!name) return false;
      const lname = name.toLowerCase();
      if (chosen.includes(lname)) return false;
      return !last || lname.includes(last);
    })
    .slice(0, users.length);

  const handleSelect = (name: string) => {
    const prefix = segments.slice(0, -1).join(',').trim();
    const newValue = multiple ? (prefix ? `${prefix}, ` : '') + name + ', ' : name;
    onChange(newValue);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <div
          className="shadow"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            marginTop: '2px',
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'var(--color-surface, #fff)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '6px',
          }}
        >
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              className="dropdown-item d-flex align-items-center gap-2"
              style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '9px 12px', color: 'var(--color-text)', borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                handleSelect(u.name ?? u.email);
              }}
            >
              <UserAvatar name={u.name || u.email} src={u.avatar_url} size={26} />
              <span className="fw-semibold">{u.name || u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

