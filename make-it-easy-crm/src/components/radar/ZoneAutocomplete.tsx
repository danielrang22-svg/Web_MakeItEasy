"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { ZoneSuggestion, ZoneSuggestionKind } from "@/lib/radar/types";

interface ZoneAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const KIND_LABEL: Record<ZoneSuggestionKind, string> = {
  area: "Barrio / zona",
  address: "Dirección",
  poi: "Punto",
};

const KIND_CLASSES: Record<ZoneSuggestionKind, string> = {
  area: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  address: "bg-muted text-muted-foreground ring-border",
  poi: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

export default function ZoneAutocomplete({ value, onChange, placeholder }: ZoneAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ZoneSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/radar/zones?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar las zonas");
        setSuggestions(Array.isArray(data.suggestions) ? (data.suggestions as ZoneSuggestion[]) : []);
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las zonas");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(suggestion: ZoneSuggestion) {
    skipFetchRef.current = true;
    onChange(suggestion.displayName);
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="radar-zone-listbox"
        aria-haspopup="listbox"
        className="w-full pl-9 pr-9 py-2.5 bg-muted rounded-xl ring-1 ring-border focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
      />
      {loading && (
        <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-muted-foreground" />
      )}

      {open && suggestions.length > 0 && (
        <ul
          id="radar-zone-listbox"
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-72 overflow-auto rounded-xl bg-card ring-1 ring-border shadow-2xl"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(suggestion)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  index === active ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{suggestion.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ring-1 font-bold ${KIND_CLASSES[suggestion.kind]}`}
                  >
                    {KIND_LABEL[suggestion.kind]}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {suggestion.displayName}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      <p className="text-[10px] text-muted-foreground mt-1">
        Escribe 3+ letras y elige una sugerencia: ciudad, barrio o dirección.
      </p>
    </div>
  );
}
