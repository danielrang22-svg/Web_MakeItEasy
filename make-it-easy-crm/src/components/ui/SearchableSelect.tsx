"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

interface SearchableSelectProps {
    label: string;
    icon?: React.ElementType;
    items: { id: string; label: string; sub?: string }[];
    value: string;
    onChange: (value: string, item?: { id: string; label: string; sub?: string }) => void;
    onCreateNew?: (text: string) => void;
    placeholder: string;
    error?: string;
    inputClass?: string;
}

export function SearchableSelect({
    label,
    icon: Icon,
    items,
    value,
    onChange,
    onCreateNew,
    placeholder,
    error,
    inputClass,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const filtered = items.filter(
        (i) =>
            i.label.toLowerCase().includes(search.toLowerCase()) ||
            (i.sub && i.sub.toLowerCase().includes(search.toLowerCase()))
    );

    const showCreate = search.trim() && !items.some((i) => i.label.toLowerCase() === search.toLowerCase());

    const defaultInputClass = `w-full ${Icon ? "pl-12" : "px-4"} pr-4 py-4 bg-card border rounded-2xl focus:ring-2 focus:ring-mie-secondary transition-all outline-none text-foreground ${error ? "border-red-500 ring-1 ring-red-500" : "border-border"}`;

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                {label}
            </label>
            <div className="relative">
                {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />}
                <input
                    type="text"
                    className={inputClass || defaultInputClass}
                    placeholder={placeholder}
                    value={open ? search : value}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        onChange(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => {
                        setOpen(true);
                        setSearch(value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            setOpen(false);
                        }
                    }}
                />
            </div>
            {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}

            {open && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {filtered.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm"
                            onClick={() => {
                                onChange(item.label, item);
                                setSearch("");
                                setOpen(false);
                            }}
                        >
                            <span className="font-medium">{item.label}</span>
                            {item.sub && (
                                <span className="text-muted-foreground ml-2 text-xs">· {item.sub}</span>
                            )}
                        </button>
                    ))}
                    {showCreate && onCreateNew && (
                        <button
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm text-mie-primary font-medium flex items-center gap-2 border-t border-border"
                            onClick={() => {
                                onCreateNew(search.trim());
                                onChange(search.trim());
                                setSearch("");
                                setOpen(false);
                            }}
                        >
                            <Plus size={14} />
                            Crear "{search.trim()}"
                        </button>
                    )}
                    {filtered.length === 0 && !showCreate && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</p>
                    )}
                </div>
            )}
        </div>
    );
}
