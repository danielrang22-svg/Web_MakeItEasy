"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Search, Users, Layers, Settings } from "lucide-react";

const ITEMS = [
  { href: "/radar", label: "Buscar", icon: Search },
  { href: "/radar/leads", label: "Mis leads", icon: Users },
  { href: "/radar/nichos", label: "Radar de nichos", icon: Layers },
  { href: "/radar/ajustes", label: "Ajustes", icon: Settings },
];

export default function RadarNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      <span className="flex items-center gap-1.5 pr-3 mr-1 text-xs font-bold text-cyan-400 shrink-0">
        <Radar size={14} /> Radar
      </span>
      {ITEMS.map((item) => {
        const active = item.href === "/radar" ? pathname === "/radar" : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active
                ? "border-cyan-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={13} /> {item.label}
          </Link>
        );
      })}
    </div>
  );
}
