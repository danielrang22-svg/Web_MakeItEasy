import { create } from "zustand";
import { Producto, ProductoCreateData, ProductoUpdateData } from "../types";

interface ProductosState {
  productos: Producto[];
  searchQuery: string;
  loadProductos: () => Promise<void>;
  createProducto: (data: ProductoCreateData) => Promise<Producto | { error: string }>;
  updateProducto: (id: string, data: ProductoUpdateData) => Promise<Producto | { error: string }>;
  deleteProducto: (id: string) => Promise<{ success?: boolean; error?: string }>;
  setSearchQuery: (query: string) => void;
}

export const useProductosStore = create<ProductosState>((set, get) => ({
  productos: [],
  searchQuery: "",

  loadProductos: async () => {
    try {
      const res = await fetch("/api/productos");
      if (res.ok) {
         const data = await res.json();
         set({ productos: data });
      }
    } catch (e) { console.error("Error fetching productos", e); }
  },

  createProducto: async (data: ProductoCreateData) => {
    const res = await fetch("/api/productos", { method: "POST", body: JSON.stringify(data) });
    const result = await res.json();
    if (res.ok) await get().loadProductos();
    return result;
  },

  updateProducto: async (id: string, data: ProductoUpdateData) => {
    const res = await fetch(`/api/productos/${id}`, { method: "PUT", body: JSON.stringify(data) });
    const result = await res.json();
    if (res.ok) await get().loadProductos();
    return result;
  },

  deleteProducto: async (id: string) => {
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (res.ok) await get().loadProductos();
    return result as any;
  },

  setSearchQuery: (query: string) => set({ searchQuery: query })
}));
