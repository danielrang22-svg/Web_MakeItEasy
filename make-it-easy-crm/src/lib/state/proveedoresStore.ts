import { create } from "zustand";
import { Proveedor, ProveedorCreateData, ProveedorUpdateData } from "../types";

interface ProveedoresState {
  proveedores: Proveedor[];
  searchQuery: string;
  loadProveedores: () => Promise<void>;
  createProveedor: (data: ProveedorCreateData) => Promise<Proveedor | { error: string }>;
  updateProveedor: (id: string, data: ProveedorUpdateData) => Promise<Proveedor | { error: string }>;
  deleteProveedor: (id: string) => Promise<{ success?: boolean; error?: string }>;
  setSearchQuery: (query: string) => void;
}

export const useProveedoresStore = create<ProveedoresState>((set, get) => ({
  proveedores: [],
  searchQuery: "",

  loadProveedores: async () => {
    try {
      const res = await fetch("/api/proveedores");
      if (res.ok) {
         const data = await res.json();
         set({ proveedores: data });
      }
    } catch (e) { console.error("Error fetching proveedores", e); }
  },

  createProveedor: async (data: ProveedorCreateData) => {
    const res = await fetch("/api/proveedores", { method: "POST", body: JSON.stringify(data) });
    const result = await res.json();
    if (res.ok) await get().loadProveedores();
    return result;
  },

  updateProveedor: async (id: string, data: ProveedorUpdateData) => {
    const res = await fetch(`/api/proveedores/${id}`, { method: "PUT", body: JSON.stringify(data) });
    const result = await res.json();
    if (res.ok) await get().loadProveedores();
    return result;
  },

  deleteProveedor: async (id: string) => {
    const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (res.ok) await get().loadProveedores();
    return result as any;
  },

  setSearchQuery: (query: string) => set({ searchQuery: query })
}));
