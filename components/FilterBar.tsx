'use client';

interface FilterBarProps {
  active: string;
  onChange: (filter: string) => void;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'painting', label: 'Painting' },
  { id: 'photography', label: 'Photography' },
  { id: 'drawing', label: 'Drawing' },
  { id: 'print', label: 'Print' },
  { id: 'sculpture', label: 'Sculpture' },
];

export default function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-end">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onChange(filter.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${
            active === filter.id
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--tag-bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
