import CategoryIcon from '@/components/CategoryIcon';
import { CATEGORY_ICONS, type CategoryIconId } from '@/lib/categoryIcons';

export default function CategoryIconPicker({ value, onChange, label }: {
  value: CategoryIconId | null;
  onChange: (icon: CategoryIconId) => void;
  label: string;
}) {
  return <fieldset>
    <legend className="field-label mb-2">{label}</legend>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {CATEGORY_ICONS.map(option => <button key={option.id} type="button" aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
        className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${value === option.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}>
        <CategoryIcon icon={option.id} className="h-9 w-9 rounded-lg" />
        <span>{option.label}</span>
      </button>)}
    </div>
  </fieldset>;
}
