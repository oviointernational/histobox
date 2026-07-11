import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface SmartSearchProps {
  onSearchChange?: (search: string) => void;
  selectedCaseIds?: string[];
  onSelectedChange?: (ids: string[]) => void;
  showChipMode?: boolean;
  placeholder?: string;
  batchActions?: { label: string; onClick: (ids: string[]) => void; variant?: 'default' | 'destructive' | 'outline' }[];
}

const SmartSearch = ({
  onSearchChange,
  selectedCaseIds = [],
  onSelectedChange,
  showChipMode = true,
  placeholder = 'Search by lab number, name, ID...',
  batchActions = [],
}: SmartSearchProps) => {
  const { cases, getDisplayId } = useStore();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [chips, setChips] = useState<string[]>(selectedCaseIds);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    onSelectedChange?.(chips);
  }, [chips]);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const s = search.toLowerCase();
    return cases
      .filter(c =>
        c.hospitalNumber.toLowerCase().includes(s) ||
        `${c.surname} ${c.firstName}`.toLowerCase().includes(s) ||
        getDisplayId(c.id).toLowerCase().includes(s)
      )
      .filter(c => !chips.includes(c.id))
      .slice(0, 8);
  }, [search, cases, chips, getDisplayId]);

  const addChip = (caseId: string) => {
    if (!chips.includes(caseId)) {
      setChips([...chips, caseId]);
    }
    setSearch('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeChip = (caseId: string) => {
    setChips(chips.filter(id => id !== caseId));
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setShowDropdown(val.length >= 2);
    onSearchChange?.(val);
  };

  const getCaseLabel = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    return c ? c.hospitalNumber : caseId.slice(0, 8);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          onFocus={() => search.length >= 2 && setShowDropdown(true)}
          className="pl-10"
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map(c => (
              <button
                key={c.id}
                onClick={() => addChip(c.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
              >
                <span className="font-mono font-bold text-primary">{c.hospitalNumber}</span>
                <span className="text-muted-foreground">—</span>
                <span>{c.surname}, {c.firstName}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{c.currentStep}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {showChipMode && chips.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {chips.map(id => (
              <Badge key={id} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                {getCaseLabel(id)}
                <button onClick={() => removeChip(id)} className="hover:text-destructive ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button onClick={() => setChips([])} className="text-xs text-muted-foreground hover:text-destructive">
              Clear all
            </button>
          </div>

          {batchActions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {batchActions.map((action, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => action.onClick(chips)}
                  className="text-xs h-7"
                >
                  {action.label} ({chips.length})
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
