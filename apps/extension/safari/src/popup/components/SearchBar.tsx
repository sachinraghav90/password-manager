import { useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SearchBar({ value, onChange, onKeyDown }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // CMD+K or CTRL+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-card border-b border-border shrink-0">
      <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input 
        ref={inputRef}
        className="flex-1 bg-transparent border-none outline-none text-foreground text-[13px] placeholder:text-muted-foreground min-w-0" 
        placeholder="Search items…" 
        autoFocus 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <kbd className="hidden sm:inline-flex text-[10px] text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium font-sans">⌘K</kbd>
    </div>
  );
}
