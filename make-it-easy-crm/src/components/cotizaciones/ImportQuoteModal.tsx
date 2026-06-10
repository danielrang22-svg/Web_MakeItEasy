import React, { useState, useRef } from "react";
import { Modal } from "../ui/SharedUI";
import { UploadCloud, File, X, Loader2 } from "lucide-react";

interface ImportQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    empresas: string[];
    contactos: { nombre: string; empresa: string }[];
    onImportSuccess: (data: any) => void;
}

export default function ImportQuoteModal({ isOpen, onClose, empresas, contactos, onImportSuccess }: ImportQuoteModalProps) {
    const [empresa, setEmpresa] = useState("");
    const [contacto, setContacto] = useState("");
    const [estado, setEstado] = useState("BORRADOR");
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter contacts based on selected company
    const availableContactos = empresa ? contactos.filter((c) => c.empresa === empresa) : contactos;

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            validateAndSetFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (f: File) => {
        setError(null);
        const name = f.name.toLowerCase();
        if (name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt')) {
            setFile(f);
        } else {
            setError("Formato no válido. Por favor sube un archivo .pdf, .docx o .txt");
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError("Debes subir un archivo para importar.");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("empresaNombre", empresa);
            formData.append("contactoNombre", contacto);
            formData.append("estado", estado);

            const res = await fetch("/api/cotizaciones/importar", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                throw new Error(b.error || "Error al procesar el archivo");
            }

            const data = await res.json();
            onImportSuccess(data);
        } catch (err: any) {
            setError(err.message || "Ocurrió un error inesperado al comunicarse con la IA.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Cotización (PDF/Word)">
            <div className="p-4 space-y-6">
                
                {/* File Uploader */}
                <div 
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragging ? "border-mie-primary bg-mie-primary/5" : "border-border bg-card"} ${file ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "hover:border-mie-primary hover:bg-surface-bright"}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                    
                    {file ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-2">
                                <File size={24} />
                            </div>
                            <p className="font-bold text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                            >
                                <X size={14} /> Quitar Archivo
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-surface-bright text-mie-primary flex items-center justify-center mb-2">
                                <UploadCloud size={24} />
                            </div>
                            <p className="font-bold text-foreground">Arrastra el archivo aquí o haz clic</p>
                            <p className="text-sm text-muted-foreground">Soporta PDF, DOCX y TXT</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900/30">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Empresa / Lead (Opcional)</label>
                        <input
                            list="empresas-list"
                            value={empresa}
                            onChange={(e) => setEmpresa(e.target.value)}
                            placeholder="Buscar o crear..."
                            className="w-full px-4 py-2.5 bg-card rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none text-sm transition-all"
                        />
                        <datalist id="empresas-list">
                            {empresas.map((e) => <option key={e} value={e} />)}
                        </datalist>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Contacto (Opcional)</label>
                        <input
                            list="contactos-list"
                            value={contacto}
                            onChange={(e) => setContacto(e.target.value)}
                            placeholder="Nombre del contacto..."
                            className="w-full px-4 py-2.5 bg-card rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none text-sm transition-all"
                        />
                        <datalist id="contactos-list">
                            {availableContactos.map((c) => <option key={c.nombre} value={c.nombre} />)}
                        </datalist>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Estado Inicial</label>
                        <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-full px-4 py-2.5 bg-card rounded-xl ring-1 ring-border focus:ring-2 focus:ring-mie-primary outline-none text-sm transition-all"
                        >
                            <option value="BORRADOR">Borrador</option>
                            <option value="REVISION_TECNICA">Enviar a Revisión Técnica</option>
                            <option value="APROBADA_TECNICAMENTE">Aprobada Técnicamente</option>
                            <option value="ENVIADA_CLIENTE">Enviada al Cliente</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-border mt-6">
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="px-5 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-surface-bright transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || isUploading}
                        className="mie-gradient text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-mie-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Procesando con IA...
                            </>
                        ) : (
                            <>
                                <UploadCloud size={18} /> Iniciar Importación
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
