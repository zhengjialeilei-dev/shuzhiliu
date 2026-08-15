import { useId } from 'react';

export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  required = true,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'url' | 'password';
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-slate-200"
        required={required}
      />
    </div>
  );
}

export function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 h-24 resize-none"
        required
      />
    </div>
  );
}

export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  renderOption?: (value: string) => string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {renderOption ? renderOption(item) : item}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LabeledFile({
  label,
  accept,
  onChange,
  required = true,
}: {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-slate-700 cursor-pointer border border-slate-200 rounded-xl"
        required={required}
      />
    </div>
  );
}
