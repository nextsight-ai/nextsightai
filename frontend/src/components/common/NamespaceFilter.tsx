import { useState, useRef, useEffect } from 'react';
import { FolderIcon, ChevronDownIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useNamespace } from '../../contexts/NamespaceContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

export default function NamespaceFilter() {
  const { namespaces, selectedNamespace, loading, setSelectedNamespace } = useNamespace();
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = selectedNamespace || 'All namespaces';

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const allNs = ['All namespaces', ...namespaces];
  const filtered = allNs.filter(ns => ns.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (ns: string) => {
    setSelectedNamespace(ns === 'All namespaces' ? '' : ns);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '3px 0',
          fontSize: 12, fontWeight: 500, color: t.text,
        }}
      >
        <FolderIcon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />
        <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Loading…' : displayValue}
        </span>
        <ChevronDownIcon style={{ width: 12, height: 12, color: t.textMuted, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9999,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 200, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MagnifyingGlassIcon style={{ width: 12, height: 12, color: t.textMuted, flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              placeholder="Search namespaces…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: t.text, width: '100%',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>No namespaces found</div>
            ) : filtered.map((ns) => {
              const selected = ns === 'All namespaces' ? selectedNamespace === '' : ns === selectedNamespace;
              return (
                <button
                  key={ns}
                  onClick={() => handleSelect(ns)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, padding: '8px 12px',
                    background: selected ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : 'transparent',
                    border: 'none', borderBottom: `1px solid ${t.cardBorder}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = t.navHoverBg; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FolderIcon style={{ width: 12, height: 12, color: selected ? '#3b82f6' : t.textMuted, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.text, fontWeight: selected ? 500 : 400 }}>{ns}</span>
                  </div>
                  {selected && <CheckIcon style={{ width: 12, height: 12, color: '#3b82f6', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
