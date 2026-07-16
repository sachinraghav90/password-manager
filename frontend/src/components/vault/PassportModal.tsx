import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronDown, Plus, Trash2, GripVertical, Tag, Plane
} from 'lucide-react';
import {
  CommonFieldEntry,
  CommonFieldType,
  COMMON_FIELD_LABELS
} from '../../lib/models/loginTypes';
import {
  PassportFormState,
  defaultPassportFormState
} from '../../lib/models/passportTypes';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore } from '../../store/useVaultStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: PassportFormState, vaultId?: string) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
  hideVaultSelector?: boolean;
}

// ---------------------------------------------------------------------------
// Small reusable building blocks
// ---------------------------------------------------------------------------



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

// ---------------------------------------------------------------------------
// Grouping Components (matches snapshot)
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="px-3 text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SectionRow({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="group relative flex border-b border-border last:border-b-0">
      {/* Drag handle area (visual to match snapshot) */}
      <div className="w-10 flex items-top pt-4 justify-center shrink-0 border-r border-border/50 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 p-3 focus-within:bg-primary/5 transition-colors">
        <label className="block text-[11px] font-semibold tracking-wide text-primary mb-1">{label}</label>
        {children}
      </div>
    </div>
  );
}

function BorderlessInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
    />
  );
}

function BorderlessSelect({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground focus:outline-none appearance-none pr-8 cursor-pointer"
      >
        <option value="" disabled className="text-muted-foreground">Select type...</option>
        {options.map(o => (
          <option key={o} value={o} className="bg-card text-foreground">{o}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
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

  const renderInput = () => {
    if (entry.fieldType === 'address') {
      return (
        <textarea
          value={entry.fieldValue}
          onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
          placeholder="Enter address…"
          rows={2}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />
      );
    }
    if (entry.fieldType === 'section') {
      return (
        <input
          type="text"
          value={entry.fieldValue}
          onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
          placeholder="Section name…"
          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      );
    }
    const typeMap: Record<string, string> = {
      url: 'url', email: 'email', date: 'date', phone: 'tel', otp: 'text', text: 'text', password: 'password'
    };
    return (
      <input
        type={typeMap[entry.fieldType] || 'text'}
        value={entry.fieldValue}
        onChange={e => onChange({ ...entry, fieldValue: e.target.value })}
        placeholder={`Enter ${entry.fieldLabel}…`}
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
          placeholder="Add tag…"
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
export function PassportModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  hideVaultSelector = false
}: PassportModalProps) {
  const { user } = useAuthStore();
  const { vaults, activeVaultId } = useVaultStore();

  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    initialData?.vaultId || activeVaultId || vaults[0]?.id || ''
  );

  const [form, setForm] = useState<PassportFormState>(() =>
    initialData ? { ...defaultPassportFormState(), ...initialData } : defaultPassportFormState()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...defaultPassportFormState(), ...initialData } : defaultPassportFormState());
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

  const set = <K extends keyof PassportFormState>(key: K, value: PassportFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

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
              <Plane className="w-5 h-5 text-primary" />
              {mode === 'create' ? 'New Passport' : 'Edit Passport'}
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
                <Plane className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <CompactInput
                  label="title"
                  value={form.title}
                  onChange={v => set('title', v)}
                  placeholder="Passport"
                  autoFocus
                />
              </div>
            </div>

            {/* Passport Details Group */}
            <Section title="Passport Details">
              <SectionRow label="type">
                <BorderlessSelect 
                  value={form.type} 
                  onChange={v => set('type', v)} 
                  options={['Regular', 'Official', 'Diplomatic', 'Other']}
                />
              </SectionRow>
              <SectionRow label="issuing country">
                <BorderlessInput value={form.issuingCountry} onChange={v => set('issuingCountry', v)} placeholder="country" />
              </SectionRow>
              <SectionRow label="number">
                <BorderlessInput value={form.number} onChange={v => set('number', v)} placeholder="passport number" />
              </SectionRow>
              <SectionRow label="full name">
                <BorderlessInput value={form.fullName} onChange={v => set('fullName', v)} placeholder="full name" />
              </SectionRow>
              <SectionRow label="gender">
                <BorderlessInput value={form.gender} onChange={v => set('gender', v)} placeholder="gender" />
              </SectionRow>
              <SectionRow label="nationality">
                <BorderlessInput value={form.nationality} onChange={v => set('nationality', v)} placeholder="nationality" />
              </SectionRow>
              <SectionRow label="issuing authority">
                <BorderlessInput value={form.issuingAuthority} onChange={v => set('issuingAuthority', v)} placeholder="issuing authority" />
              </SectionRow>
              <SectionRow label="date of birth">
                <BorderlessInput value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} placeholder="YYYY-MM-DD" type="date" />
              </SectionRow>
              <SectionRow label="place of birth">
                <BorderlessInput value={form.placeOfBirth} onChange={v => set('placeOfBirth', v)} placeholder="place of birth" />
              </SectionRow>
              <SectionRow label="issued on">
                <BorderlessInput value={form.issuedOn} onChange={v => set('issuedOn', v)} placeholder="YYYY-MM-DD" type="date" />
              </SectionRow>
              <SectionRow label="expiry date">
                <BorderlessInput value={form.expiryDate} onChange={v => set('expiryDate', v)} placeholder="YYYY-MM-DD" type="date" />
              </SectionRow>
            </Section>

            {/* Common fields */}
            {form.commonFields.length > 0 && (
              <div className="space-y-2 mb-6">
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

            {/* Add More */}
            <div className="mb-6">
              <AddMoreMenu onAdd={addCommonField} />
            </div>

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
              <span className="text-muted-foreground/40 hidden sm:inline-block">·</span>
              
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
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
