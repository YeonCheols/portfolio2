import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type SelectFieldProps<T extends string> = {
  id: string;
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export const SelectField = <T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<T>) => (
  <div className="relative text-sm font-semibold">
    <label htmlFor={id}>{label}</label>
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <ListboxButton
        id={id}
        aria-label={label}
        type="button"
        className="group mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-medium text-slate-900 shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10 data-[disabled]:cursor-not-allowed data-[disabled]:bg-slate-100 data-[disabled]:text-slate-400"
      >
        <span className="truncate">
          {options.find((option) => option.value === value)?.label ?? value}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-data-[open]:rotate-180"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ListboxButton>
      <ListboxOptions
        modal={false}
        className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl shadow-slate-900/10 outline-none"
      >
        {options.map((option) => (
          <ListboxOption
            key={option.value}
            value={option.value}
            className="group flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 font-medium text-slate-700 outline-none data-[focus]:bg-slate-100 data-[selected]:bg-blue-50 data-[selected]:text-blue-700"
          >
            <span className="truncate">{option.label}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="invisible h-4 w-4 shrink-0 text-blue-600 group-data-[selected]:visible"
            >
              <path
                d="m4.5 10 3.5 3.5 7.5-7.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  </div>
);
