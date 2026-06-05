"use client";

import React, { useEffect, useState } from "react";
import { Package, Search, Plus, Trash2, Pencil, AlertCircle } from "lucide-react";
import { useProductosStore } from "@/lib/state/productosStore";
import { Producto } from "@/lib/types";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import { formatCurrency } from "@/lib/constants";

const TIPOS_PRODUCTO = [
  { value: "producto", label: "Producto" },
  { value: "servicio", label: "Servicio" },
];

const defaultForm = () => ({
  referencia: `REF-${Math.floor(Math.random() * 10000)}`,
  nombre: "",
  proveedor: "",
  costoEstimado: "" as number | "",
  precioSugerido: "" as number | "",
  tipo: "servicio" as "producto" | "servicio",
  descripcion: "",
});

export default function ProductosPage() {
  const { productos, loadProductos, createProducto, updateProducto, deleteProducto, searchQuery, setSearchQuery } = useProductosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingProd, setEditingProd] = useState<Producto | null>(null);
  const [deletingProd, setDeletingProd] = useState<Producto | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => { loadProductos(); }, [loadProductos]);

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.referencia.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openCreate() {
    setEditingProd(null);
    setForm(defaultForm());
    setShowForm(true);
  }

  function openEdit(prod: Producto) {
    setEditingProd(prod);
    setForm({
      referencia: prod.referencia,
      nombre: prod.nombre,
      proveedor: prod.proveedor,
      costoEstimado: prod.costoEstimado,
      precioSugerido: prod.precioSugerido,
      tipo: (prod.tipo || "servicio") as "producto" | "servicio",
      descripcion: prod.descripcion || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...form,
      costoEstimado: Number(form.costoEstimado) || 0,
      precioSugerido: Number(form.precioSugerido) || 0,
      activo: true,
    };

    if (editingProd) {
      const res = await updateProducto(editingProd.id, data);
      if ('error' in res) setToast({ message: res.error as string, type: "error" });
      else { setToast({ message: "Producto/Servicio actualizado", type: "success" }); setShowForm(false); }
    } else {
      const res = await createProducto(data);
      if ('error' in res) setToast({ message: res.error as string, type: "error" });
      else {
        setToast({ message: "Producto/Servicio creado correctamente", type: "success" });
        setShowForm(false);
      }
    }
  }

  async function handleDelete() {
    if (!deletingProd) return;
    const res = await deleteProducto(deletingProd.id);
    setDeletingProd(null);
    if (res.error) setToast({ message: res.error, type: "error" });
    else setToast({ message: "Producto/Servicio eliminado", type: "info" });
  }

  const inputCls = "w-full px-4 py-2.5 bg-surface-dim border border-border-glass rounded-xl text-text-primary text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-secondary";
  const labelCls = "text-[10px] font-bold uppercase tracking-wider text-text-secondary ml-1 mb-1.5 block";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <style>{`
        .glass-panel {
          background: rgba(22, 30, 44, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
        }
      `}</style>
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Package size={22} className="text-primary" />
            Catálogo de Servicios y Productos
          </h2>
          <p className="font-sans text-xs text-text-secondary mt-1">
            {filtered.length} items registrados para tus cotizaciones
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)]"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nuevo Item
        </button>
      </div>

      {/* Main glass panel */}
      <div className="glass-panel rounded-xl border border-border-glass flex flex-col">
        {/* Search bar inside panel */}
        <div className="p-4 border-b border-border-glass/40">
          <div className="relative group max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              className="bg-surface-dim border border-border-glass/60 rounded-full pl-9 pr-4 py-1.5 text-text-primary text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full transition-all placeholder:text-text-secondary"
              placeholder="Buscar por nombre, referencia o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-dim/50 border-b border-border-glass">
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Referencia</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Nombre</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Tipo</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Proveedor</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Costos / Precios</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-text-secondary text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-glass">
              {filtered.map(prod => (
                <tr key={prod.id} className="hover:bg-surface-bright/30 transition-colors group">
                  <td className="py-4 px-4 align-top">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded whitespace-nowrap">
                      {prod.referencia}
                    </span>
                  </td>
                  <td className="py-4 px-4 align-top max-w-sm">
                    <p className="font-semibold text-xs text-text-primary leading-tight">{prod.nombre}</p>
                    {prod.descripcion && (
                      <p className="text-[10px] text-text-secondary mt-1 max-w-xs truncate" title={prod.descripcion}>
                        {prod.descripcion}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4 align-top">
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded border bg-secondary/10 border-secondary/20 text-secondary whitespace-nowrap">
                      {prod.tipo}
                    </span>
                  </td>
                  <td className="py-4 px-4 align-top text-xs text-text-secondary">
                    {prod.proveedor || "-"}
                  </td>
                  <td className="py-4 px-4 align-top text-xs">
                    <div className="flex flex-col gap-1 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-text-secondary w-10">Costo:</span>
                        <span className="font-semibold text-error/90">{formatCurrency(prod.costoEstimado)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-text-secondary w-10">Precio:</span>
                        <span className="font-bold text-tertiary">{formatCurrency(prod.precioSugerido)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(prod)}
                        className="p-1.5 rounded text-text-secondary hover:text-primary hover:bg-surface-bright transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingProd(prod)}
                        className="p-1.5 rounded text-error hover:text-white hover:bg-error-container/40 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-secondary">
            <Package size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-semibold text-sm">No hay productos/servicios en el catálogo</p>
            <p className="text-xs text-text-secondary mt-1">Usa el botón "Nuevo Item" para añadir tu primer servicio.</p>
          </div>
        )}
      </div>

      {/* Modal de Crear / Editar */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingProd ? "Editar Item" : "Nuevo Item"}>
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
          
          {/* Tipo: Producto / Servicio */}
          <div>
            <label className={labelCls}>Tipo *</label>
            <div className="flex gap-4">
              {TIPOS_PRODUCTO.map(t => (
                <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={t.value}
                    checked={form.tipo === t.value}
                    onChange={() => setForm(f => ({ ...f, tipo: t.value as any }))}
                    className="text-primary bg-surface-dim border-border-glass"
                  />
                  <span className="font-semibold text-xs text-text-primary">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Código SKU / Referencia *</label>
              <input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Proveedor</label>
              <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Costo Estimado</label>
              <input type="number" value={form.costoEstimado} onChange={e => setForm(f => ({ ...f, costoEstimado: e.target.value === "" ? "" : Number(e.target.value) }))} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Precio Sugerido *</label>
              <input
                type="number"
                required
                min={0}
                value={form.precioSugerido}
                onChange={e => setForm(f => ({ ...f, precioSugerido: e.target.value === "" ? "" : Number(e.target.value) }))}
                className={inputCls}
                placeholder="Ej: 50000"
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Descripción (opcional)</label>
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-gradient-to-r from-primary-container to-primary text-on-primary-fixed font-bold py-2.5 rounded-xl hover:opacity-95 transition-opacity shadow-[0_0_15px_rgba(138,235,255,0.2)] text-xs">
              {editingProd ? "Guardar Cambios" : "Crear Item"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl bg-surface-dim border border-border-glass text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-bright transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deletingProd} title="Eliminar Item" message={`¿Estás seguro de eliminar "${deletingProd?.nombre}"? Se ocultará del catálogo del CRM.`} onConfirm={handleDelete} onCancel={() => setDeletingProd(null)} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
