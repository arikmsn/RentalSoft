import { useState, useRef, useEffect } from 'react';

interface MultiselectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function Multiselect({ label, options, selected, onChange, placeholder = 'בחר...' }: MultiselectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-surface-700 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 border border-surface-200 rounded-xl bg-white text-right flex items-center justify-between hover:border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
      >
        <span className={`text-sm ${selected.length === 0 ? 'text-surface-400' : 'text-surface-800'}`}>
          {selected.length === 0 
            ? placeholder 
            : selected.length === 1 
              ? selected[0] 
              : `${selected.length} נבחרו`}
        </span>
        <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-surface-200 rounded-xl shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-surface-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-surface-400 text-sm">אין תוצאות</div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-surface-700">{option}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-surface-100">
              <button
                type="button"
                onClick={clearAll}
                className="w-full px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              >
                נקה הכל
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
