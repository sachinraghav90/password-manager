import { useAuthAdapter, useVaultAdapter, useSettingsAdapter, useAccountAdapter } from '../../adapters';
import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronDown, Plus, Trash2, Settings2, GripVertical, Eye, EyeOff, Tag, MapPin, Key
} from 'lucide-react';
import {
  LoginFormState,
  WebsiteEntry,
  CommonFieldEntry,
  CommonFieldType,
  AutofillBehavior,
  COMMON_FIELD_LABELS,
  SIGN_IN_WITH_PROVIDERS,
  defaultLoginFormState,
} from '@vaultguard/models';



// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LoginItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: LoginFormState, vaultId?: string) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
  hideVaultSelector?: boolean;
}

// ---------------------------------------------------------------------------
// Small reusable building blocks
// ---------------------------------------------------------------------------

const AUTOFILL_LABELS: Record<AutofillBehavior, string> = {
  fill_anywhere: 'Fill anywhere on this website',
  fill_exact_host: 'Only fill on this exact host',
  never_fill: 'Never fill on this website',
};

const COMMON_FIELD_OPTIONS: CommonFieldType[] = [
  'text', 'url', 'email', 'address', 'date', 'otp', 'password', 'phone', 'sign_in_with', 'section',
];

function FieldRow({ children, drag = false }: { children: React.ReactNode; drag?: boolean }) {
  return (
    <div className="relative group w-full">
      {drag && (
        <button
          type="button"
          className="absolute -left-5 top-2.5 p-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus = false,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={`border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all ${className}`}>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </div>
  );
}

function PasswordRow({
  value,
  onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">password</label>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Autofill popover (inline)
// ---------------------------------------------------------------------------
function AutofillPopover({
  value,
  onChange,
  onClose,
}: { value: AutofillBehavior; onChange: (v: AutofillBehavior) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const options: AutofillBehavior[] = ['fill_anywhere', 'fill_exact_host', 'never_fill'];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Autofill Behavior</p>
      </div>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => { onChange(opt); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors ${value === opt ? 'text-primary font-medium' : 'text-foreground'}`}
        >
          <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${value === opt ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
          <span>{AUTOFILL_LABELS[opt]}</span>
          {opt === 'fill_anywhere' && (
            <span className="ml-auto text-[9px] bg-muted text-muted-foreground rounded px-1 py-0.5 font-bold uppercase">Default</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Website row
// ---------------------------------------------------------------------------
function WebsiteRow({
  entry,
  onChange,
  onDelete,
  showDelete,
}: {
  entry: WebsiteEntry;
  onChange: (updated: WebsiteEntry) => void;
  onDelete: () => void;
  showDelete: boolean;
}) {
  const [showAutofill, setShowAutofill] = useState(false);

  return (
    <FieldRow drag>
      <div className="relative border border-border rounded-lg bg-card focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
        <div className="px-3 py-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">website</label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={entry.url}
              onChange={e => onChange({ ...entry, url: e.target.value })}
              placeholder="https://example.com"
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowAutofill(v => !v)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="Autofill behavior"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              {showDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                  title="Remove website"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        {showAutofill && (
          <AutofillPopover
            value={entry.autofillBehavior ?? entry.autofill ?? 'fill_anywhere'}
            onChange={autofillBehavior => onChange({ ...entry, autofillBehavior })}
            onClose={() => setShowAutofill(false)}
          />
        )}
      </div>
    </FieldRow>
  );
}

// ---------------------------------------------------------------------------
// Common field row (from "Add more")
// ---------------------------------------------------------------------------
function CommonFieldRow({
  entry,
  onChange,
  onDelete,
}: {
  entry: CommonFieldEntry;
  onChange: (updated: CommonFieldEntry) => void;
  onDelete: () => void;
}) {
  const [labelEdit, setLabelEdit] = useState(false);
  const [visiblePw, setVisiblePw] = useState(false);

  const renderInput = () => {
    if (entry.fieldType === 'password') {
      return (
        <div className="flex items-center gap-2">
          <input
            type={visiblePw ? 'text' : 'password'}
            value={entry.fieldValue}
            onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <button type="button" onClick={() => setVisiblePw(v => !v)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
            {visiblePw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      );
    }
    if (entry.fieldType === 'address') {
      return (
        <textarea
          value={entry.fieldValue}
          onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
          placeholder="Enter addressâ€¦"
          rows={2}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />
      );
    }
    if (entry.fieldType === 'sign_in_with') {
      return (
        <select
          value={entry.fieldValue}
          onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
          className="w-full bg-transparent text-sm text-foreground focus:outline-none"
        >
          <option value="">Select providerâ€¦</option>
          {SIGN_IN_WITH_PROVIDERS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      );
    }
    if (entry.fieldType === 'section') {
      return (
        <input
          type="text"
          value={entry.fieldValue}
          onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
          placeholder="Section nameâ€¦"
          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      );
    }
    const typeMap: Record<string, string> = {
      url: 'url', email: 'email', date: 'date', phone: 'tel', otp: 'text', text: 'text',
    };
    return (
      <input
        type={typeMap[entry.fieldType] || 'text'}
        value={entry.fieldValue}
        onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
        placeholder={`Enter ${entry.fieldLabel}â€¦`}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    );
  };

  return (
    <FieldRow drag>
      <div className="border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {labelEdit ? (
              <input
                autoFocus
                className="block w-full text-[10px] font-semibold uppercase tracking-wider text-primary bg-transparent focus:outline-none border-b border-primary/50 mb-0.5"
                value={entry.fieldLabel}
                onChange={e => onChange({ ...entry, fieldLabel: e.target.value })}
                onBlur={() => setLabelEdit(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setLabelEdit(true)}
                className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5 hover:text-primary transition-colors"
              >
                {entry.fieldLabel}
              </button>
            )}
            {renderInput()}
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="mt-1 p-1 text-muted-foreground hover:text-destructive transition-colors rounded shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </FieldRow>
  );
}

// ---------------------------------------------------------------------------
// Add More Dropdown
// ---------------------------------------------------------------------------
function AddMoreMenu({ onAdd }: { onAdd: (type: CommonFieldType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors py-1 px-2 rounded hover:bg-primary/5"
      >
        <Plus className="w-4 h-4" />
        <span>add more</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          {COMMON_FIELD_OPTIONS.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => { onAdd(type); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
            >
              {COMMON_FIELD_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags input
// ---------------------------------------------------------------------------
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  return (
    <div className="border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">tags</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter(t => t !== tag))}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } if (e.key === ',') { e.preventDefault(); addTag(); } }}
          placeholder="Add tagâ€¦"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {input && (
          <button type="button" onClick={addTag} className="text-xs text-primary hover:text-primary/80">Add</button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------
export function LoginItemModal({
  isOpen,
  initialData,
  onClose,
  onSave,
  mode,
  hideVaultSelector = false,
}: LoginItemModalProps) {
  const { user } = useAuthAdapter();
  const { vaults, activeVaultId } = useVaultAdapter();

  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    initialData?.vaultId || activeVaultId || vaults[0]?.id || ''
  );

  const [form, setForm] = useState<LoginFormState>(() =>
    initialData ? { ...defaultLoginFormState(), ...initialData } : defaultLoginFormState()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...defaultLoginFormState(), ...initialData } : defaultLoginFormState());
      setErrors([]);
    }
  }, [isOpen, initialData]);

  // Keyboard close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = <K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Website helpers
  const updateWebsite = (id: string, updated: WebsiteEntry) =>
    set('websites', form.websites.map(w => w.id === id ? updated : w));
  const addWebsite = () =>
    set('websites', [...form.websites, { id: crypto.randomUUID(), url: '', autofillBehavior: 'fill_anywhere' }]);
  const removeWebsite = (id: string) =>
    set('websites', form.websites.filter(w => w.id !== id));

  // Common field helpers
  const addCommonField = (type: CommonFieldType) => {
    const newField: CommonFieldEntry = {
      id: crypto.randomUUID(),
      fieldType: type,
      fieldLabel: COMMON_FIELD_LABELS[type],
      fieldValue: '',
    };
    set('commonFields', [...form.commonFields, newField]);
  };
  const updateCommonField = (id: string, updated: CommonFieldEntry) =>
    set('commonFields', form.commonFields.map(f => f.id === id ? updated : f));
  const removeCommonField = (id: string) =>
    set('commonFields', form.commonFields.filter(f => f.id !== id));

  const handleSave = async () => {
    if (isSaving || !selectedVaultId) return;
    setIsSaving(true);
    const errs: string[] = [];
    if (!form.title.trim()) errs.push('Title is required');
    for (const w of form.websites) {
      if (w.url && !/^https?:\/\/.+/.test(w.url)) {
        errs.push(`Invalid URL: "${w.url}"`);
      }
    }
    if (errs.length > 0) { setErrors(errs); setIsSaving(false); return; }

    try {
      setErrors([]);
      await onSave(form, selectedVaultId);
      onClose();
    } catch (e: any) {
      setErrors([e.message || 'Failed to save']);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">

          {/* ---- Sticky Header ---- */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center text-base font-semibold text-foreground flex items-center justify-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {mode === 'create' ? 'New Item' : 'Edit Login'}
            </h2>
            {/* spacer to balance back button */}
            <div className="w-8" />
          </div>

          {/* ---- Scrollable Body ---- */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">

            {/* Error banner */}
            {errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg space-y-1">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {/* Title */}
            <div className="flex items-start gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border text-primary flex items-center justify-center shrink-0 mt-1">
                <Key className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <CompactInput
                  label="title"
                  value={form.title}
                  onChange={v => set('title', v)}
                  placeholder="Title"
                  autoFocus
                />
              </div>
            </div>

            {/* Username */}
            <CompactInput
              label="username"
              value={form.username}
              onChange={v => set('username', v)}
              placeholder="username"
            />

            {/* Password */}
            <PasswordRow
              value={form.password}
              onChange={v => set('password', v)}
            />

            {/* Websites */}
            <div className="space-y-2">
              {form.websites.map(w => (
                <WebsiteRow
                  key={w.id}
                  entry={w}
                  onChange={updated => updateWebsite(w.id, updated)}
                  onDelete={() => removeWebsite(w.id)}
                  showDelete={form.websites.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={addWebsite}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors py-1 px-2 rounded hover:bg-primary/5"
              >
                <Plus className="w-4 h-4" />
                add another website
              </button>
            </div>

            {/* Add More */}
            <AddMoreMenu onAdd={addCommonField} />

            {/* Common fields */}
            {form.commonFields.length > 0 && (
              <div className="space-y-2">
                {form.commonFields.map(f => (
                  <CommonFieldRow
                    key={f.id}
                    entry={f}
                    onChange={updated => updateCommonField(f.id, updated)}
                    onDelete={() => removeCommonField(f.id)}
                  />
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Add any notes about this item here."
                rows={3}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
              />
            </div>

            {/* Location */}
            <div className="border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-3 shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="add a location"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Tags */}
            <TagsInput tags={form.tags} onChange={v => set('tags', v)} />

          </div>

          {/* ---- Sticky Footer ---- */}
          <div className="flex items-center gap-3 px-5 py-3 border-t border-border shrink-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline-block">{user?.fullName || 'User'}</span>
              <span className="text-muted-foreground/40 hidden sm:inline-block">Â·</span>
              
              {!hideVaultSelector && (
                <div className="relative">
                  <select 
                    value={selectedVaultId}
                    onChange={(e) => setSelectedVaultId(e.target.value)}
                    disabled={mode === 'edit'}
                    className="h-7 pl-2 pr-8 text-xs font-medium bg-transparent border border-transparent hover:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select Vault</option>
                    {vaults.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="shrink-0 px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Savingâ€¦' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}


