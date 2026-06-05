"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Toast, ConfirmDialog } from "@/components/ui/SharedUI";
import { Users, Shield, Plus, Lock, Pencil, ShieldAlert, UserCheck, UserX } from "lucide-react";

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: "admin" | "ventas";
  activo: boolean;
  fechaCreacion: string;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/usuarios");
      if (res.status === 401) {
        // Redirigir si no tiene rango admnistrador
        router.push("/?error=Acceso Denegado");
        return;
      }
      if (!res.ok) throw new Error("Error fetching");
      const data = await res.json();
      setUsuarios(data);
    } catch (e) {
      setToast({ message: "Error cargando usuarios", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(user: User) {
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !user.activo })
      });
      if (res.status === 400) {
        const errorData = await res.json();
        setToast({ message: errorData.error, type: "error" });
        return;
      }
      if (!res.ok) throw new Error("Update error");
      setToast({ message: `Usuario ${!user.activo ? "Activado" : "Desactivado"}`, type: "success" });
      fetchUsers();
    } catch (e) {
      setToast({ message: "Error al actualizar estado", type: "error" });
    }
  }

  async function saveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    try {
      if (editingUser) {
        const res = await fetch(`/api/usuarios/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: data.rol })
        });
        if (!res.ok) throw new Error();
        setToast({ message: "Rol actualizado correctamente", type: "success" });
      } else {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const err = await res.json();
          setToast({ message: err.error || "Error", type: "error" });
          return;
        }
        setToast({ message: "Usuario creado. Dile que inicie sesión.", type: "success" });
      }
      setShowForm(false);
      fetchUsers();
    } catch (e) {
      setToast({ message: "Error en la operación", type: "error" });
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Verificando accesos...</div>;

  return (
    <div className="px-5 pb-32">
      <div className="mt-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-500" />
            Gestión de Personal
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Solo Administradores. Crea representantes de ventas o promueve cuentas.
          </p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="bg-mie-secondary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-card ring-1 ring-border rounded-3xl overflow-hidden shadow-sm mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-3 px-5 font-semibold text-muted-foreground">Usuario</th>
                <th className="py-3 px-5 font-semibold text-muted-foreground">Email</th>
                <th className="py-3 px-5 font-semibold text-muted-foreground">Rol</th>
                <th className="py-3 px-5 font-semibold text-muted-foreground text-center">Estado</th>
                <th className="py-3 px-5 font-semibold text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${!u.activo ? "opacity-60" : ""}`}>
                  <td className="py-4 px-5 font-bold flex items-center gap-2">
                    <div className={`p-2 rounded-full ${u.rol === "admin" ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-blue-100 text-mie-primary dark:bg-blue-900/30"}`}>
                      {u.rol === "admin" ? <Shield size={16} /> : <Users size={16} />}
                    </div>
                    {u.nombre}
                  </td>
                  <td className="py-4 px-5">{u.email}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${u.rol === "admin" ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-blue-100 text-mie-primary dark:bg-blue-900/30"}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${u.activo ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-gray-200 text-gray-500 dark:bg-gray-800"}`}>
                       {u.activo ? "Activo" : "Suspendido"}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex gap-2 justify-end">
                       <button 
                         onClick={() => { setEditingUser(u); setShowForm(true); }}
                         className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                         title="Editar Rol"
                       >
                         <Pencil size={16} />
                       </button>
                       <button 
                         onClick={() => toggleStatus(u)}
                         className={`p-1.5 rounded-lg ${u.activo ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                         title={u.activo ? "Desactivar" : "Activar"}
                       >
                         {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingUser ? "Editar Perfil" : "Invitar Usuario"}>
        <form onSubmit={saveUser} className="space-y-4">
          {!editingUser && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nombre Completo</label>
                <input name="nombre" type="text" required className="w-full p-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-mie-secondary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Email Profesional</label>
                <input name="email" type="email" required className="w-full p-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-mie-secondary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Clave de Acceso Temporal</label>
                <div className="relative">
                   <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input name="password" type="password" required minLength={8} className="w-full pl-9 p-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-mie-secondary outline-none" placeholder="Mínimo 8 caracteres" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nivel de Acceso (Rol)</label>
            <select name="rol" required defaultValue={editingUser?.rol || "ventas"} className="w-full p-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-mie-secondary outline-none">
              <option value="ventas">🧑‍💼 Equipo de Ventas (Estándar)</option>
              <option value="admin">🛡️ Administrador General</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-colors">Cancelar</button>
             <button type="submit" className="flex-1 py-3 bg-mie-secondary text-white hover:bg-mie-secondary/90 rounded-xl font-bold transition-all shadow-md">Instanciar Cuenta</button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
