import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { ITEM_REGISTRY } from '../../lib/itemRegistry';
import { ItemType } from '../../lib/db/schema';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ItemType) => void;
}

const REGISTRY_ENTRIES = Object.values(ITEM_REGISTRY).map((config, index) => {
  // Generate some consistent colors based on index or category
  const colors = [
    { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { color: 'text-violet-500', bg: 'bg-violet-500/10' }
  ];
  const colorObj = colors[index % colors.length];

  return {
    id: config.type,
    label: config.displayName,
    icon: config.icon,
    color: colorObj.color,
    bg: colorObj.bg
  };
});

export function NewItemModal({ isOpen, onClose, onSelectType }: NewItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTypes = REGISTRY_ENTRIES.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="relative p-6 pb-4 flex flex-col items-center border-b border-border">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-semibold mb-6">What would you like to add?</h2>
          
          <div className="w-full relative max-w-md mx-auto">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 bg-accent/50 border-transparent focus:border-primary w-full"
              placeholder="Try searching anything"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="w-full mx-auto space-y-3">
            {filteredTypes.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredTypes.map(item => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTimeout(() => {
                        onSelectType(item.id);
                        onClose();
                      }, 0);
                    }}
                    className="flex flex-col items-start w-full p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left cursor-pointer select-none"
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center mb-3 pointer-events-none`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm pointer-events-none">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {filteredTypes.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No item types match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
