"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  carBrandSuggestions,
  sanitizeCarBrandInput,
} from "@/lib/carBrands";
import { resolveCarBrandComboboxEnter } from "@/lib/carBrandComboboxKeyboard";

type CarBrandComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  noMatches: string;
  listLabel: string;
  inputClassName: string;
};

export default function CarBrandCombobox({
  value,
  onChange,
  label,
  placeholder,
  noMatches,
  listLabel,
  inputClassName,
}: CarBrandComboboxProps) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = useMemo(
    () => carBrandSuggestions(value, value),
    [value],
  );
  const activeIndex =
    suggestions.length === 0 ? 0 : Math.min(highlight, suggestions.length - 1);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function commit(next: string) {
    onChange(sanitizeCarBrandInput(next));
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      setHighlight((current) => {
        if (suggestions.length === 0) return 0;
        return (Math.min(current, suggestions.length - 1) + 1) % suggestions.length;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(suggestions.length === 0 ? 0 : suggestions.length - 1);
        return;
      }
      setHighlight((current) => {
        if (suggestions.length === 0) return 0;
        const clamped = Math.min(current, suggestions.length - 1);
        return (clamped - 1 + suggestions.length) % suggestions.length;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (
        resolveCarBrandComboboxEnter({
          open,
          highlighted: suggestions[activeIndex],
        }) === "select_highlight"
      ) {
        commit(suggestions[activeIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && suggestions[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => onChange(sanitizeCarBrandInput(value))}
        onKeyDown={onKeyDown}
        className={`${inputClassName} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={listLabel}
        hidden={!open}
        className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-xl border-[3px] border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      >
          {suggestions.length > 0 ? (
            suggestions.map((brand, index) => (
              <li key={`${brand}-${index}`} role="none">
                <button
                  type="button"
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`w-full cursor-pointer px-3 py-2 text-left text-sm font-bold ${
                    index === activeIndex ? "bg-[#FFD100] text-black" : "bg-white text-black"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(brand);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {brand}
                </button>
              </li>
            ))
          ) : (
            <li role="none" className="px-3 py-2 text-xs font-bold text-neutral-600">
              {noMatches}
            </li>
          )}
      </ul>
    </div>
  );
}
