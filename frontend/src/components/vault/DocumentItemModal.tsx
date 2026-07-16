import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronDown, Plus, Trash2, GripVertical, Tag, FileText
} from 'lucide-react';
import {
  CommonFieldEntry,
  CommonFieldType,
  COMMON_FIELD_LABELS
} from '../../lib/models/loginTypes';
import {
  DocumentFormState,
  defaultDocumentFormState,
  DocumentFile
} from '../../lib/models/documentTypes';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore } from '../../store/useVaultStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DocumentItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: DocumentFormState, vaultId?: string) => Promise<void>;
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
export function DocumentItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  hideVaultSelector = false
}: DocumentItemModalProps) {
  const { user } = useAuthStore();
  const { vaults, activeVaultId } = useVaultStore();

  const [selectedVaultId, setSelectedVaultId] = useState<string>(
    initialData?.vaultId || activeVaultId || vaults[0]?.id || ''
  );

  const [form, setForm] = useState<DocumentFormState>(() =>
    initialData ? { ...defaultDocumentFormState(), ...initialData } : defaultDocumentFormState()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...defaultDocumentFormState(), ...initialData } : defaultDocumentFormState());
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

  const set = <K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Simulate reading the file and saving it to the state
    Promise.all(files.map(f => {
      return new Promise<DocumentFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: f.name,
            size: f.size,
            type: f.type,
            base64: event.target?.result as string
          });
        };
        reader.readAsDataURL(f);
      });
    })).then(newFiles => {
      setForm(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    });
  };

  const removeFile = (index: number) => {
    setForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    Promise.all(files.map(f => {
      return new Promise<DocumentFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: f.name,
            size: f.size,
            type: f.type,
            base64: event.target?.result as string
          });
        };
        reader.readAsDataURL(f);
      });
    })).then(newFiles => {
      setForm(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    });
  };

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
              <FileText className="w-5 h-5 text-primary" />
              {mode === 'create' ? 'New Document' : 'Edit Document'}
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
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-500 flex items-center justify-center shrink-0 mt-1 relative">
                <FileText className="w-8 h-8" />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-md p-0.5 border border-border">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <CompactInput
                  label="title"
                  value={form.title}
                  onChange={v => set('title', v)}
                  placeholder="Document"
                  autoFocus
                />
              </div>
            </div>

            {/* Document Drag & Drop Area */}
            {form.files.length === 0 ? (
              <div className="mb-4">
                <div 
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center group cursor-pointer transition-colors ${
                    isDragging ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-primary/5 hover:border-primary/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className={`w-16 h-16 mb-4 rounded-xl border border-dashed flex items-center justify-center transition-colors ${
                    isDragging ? 'text-primary border-primary/50' : 'border-muted-foreground/40 text-muted-foreground/40 group-hover:text-primary/60 group-hover:border-primary/40'
                  }`}>
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                    {isDragging ? 'Drop file here...' : 'Click or drag a file here to upload.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                {form.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-sm group">
                    <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-foreground">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{(f.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(i)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileSelect} 
            />

            {/* Add File Button */}
            <div className="mb-6">
              <button 
                onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors px-1"
              >
                <Plus className="w-4 h-4" /> Add File
              </button>
            </div>

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
