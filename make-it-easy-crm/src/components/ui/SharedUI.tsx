"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// ══════════════════════════════════════════════════════
// Toast
// ══════════════════════════════════════════════════════
interface ToastProps {
    message: string;
    type?: "success" | "error" | "info";
    onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    const config = {
        success: {
            icon: CheckCircle,
            bg:   "rgba(74,222,128,0.12)",
            border: "rgba(74,222,128,0.3)",
            color: "var(--success)",
            textColor: "var(--on-surface)",
        },
        error: {
            icon: AlertCircle,
            bg:   "rgba(255,113,108,0.12)",
            border: "rgba(255,113,108,0.3)",
            color: "var(--error)",
            textColor: "var(--on-surface)",
        },
        info: {
            icon: Info,
            bg:   "rgba(143,245,255,0.1)",
            border: "rgba(143,245,255,0.25)",
            color: "var(--primary)",
            textColor: "var(--on-surface)",
        },
    }[type];

    const Icon = config.icon;

    return (
        <div
            className="fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl animate-slide-up shadow-lg max-w-sm"
            style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
                backdropFilter: "blur(12px)",
                boxShadow: "var(--shadow-lg)"
            }}
        >
            <Icon size={18} style={{ color: config.color, flexShrink: 0 }} />
            <span className="text-sm font-medium flex-1" style={{ color: config.textColor }}>
                {message}
            </span>
            <button
                onClick={onClose}
                className="ml-1 rounded-lg p-0.5 transition-colors"
                style={{ color: "var(--on-surface-variant)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--on-surface)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--on-surface-variant)")}
            >
                <X size={15} />
            </button>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Modal
// ══════════════════════════════════════════════════════
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    wide?: boolean;
    zIndex?: number;
}

export function Modal({ isOpen, onClose, title, children, wide, zIndex }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 flex items-end sm:items-center justify-center"
            style={{ zIndex: zIndex ?? 50 }}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 ios-blur"
                style={{ background: "rgba(0,0,0,0.6)" }}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`relative w-full ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"} max-h-[90vh] overflow-y-auto animate-slide-up custom-scrollbar`}
                style={{
                    background: "var(--surface-container)",
                    border: "1px solid var(--outline-variant)",
                    borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
                    boxShadow: "var(--shadow-lg)"
                }}
                // Desktop: fully rounded
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderRadius = "var(--radius-xl)";
                }}
            >
                {/* Title bar */}
                {title && (
                    <div
                        className="sticky top-0 px-6 py-4 flex items-center justify-between ios-blur"
                        style={{
                            background: "rgba(21,26,35,0.9)",
                            borderBottom: "1px solid var(--outline-variant)",
                            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0"
                        }}
                    >
                        <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl transition-colors"
                            style={{ color: "var(--on-surface-variant)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// Badge — Stitch chip style
// ══════════════════════════════════════════════════════
interface BadgeProps {
    children: React.ReactNode;
    colorClass?: string;
    textColorClass?: string;
    variant?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "error" | "default";
}

const BADGE_VARIANTS = {
    primary:   { bg: "rgba(143,245,255,0.1)",  color: "var(--primary)",   border: "rgba(143,245,255,0.25)" },
    secondary: { bg: "rgba(175,136,255,0.12)", color: "var(--secondary)", border: "rgba(175,136,255,0.3)" },
    tertiary:  { bg: "rgba(71,196,255,0.1)",   color: "var(--tertiary)",  border: "rgba(71,196,255,0.25)" },
    success:   { bg: "rgba(74,222,128,0.1)",   color: "var(--success)",   border: "rgba(74,222,128,0.25)" },
    warning:   { bg: "rgba(251,191,36,0.1)",   color: "var(--warning)",   border: "rgba(251,191,36,0.25)" },
    error:     { bg: "rgba(255,113,108,0.1)",  color: "var(--error)",     border: "rgba(255,113,108,0.25)" },
    default:   { bg: "rgba(255,255,255,0.06)", color: "var(--on-surface-variant)", border: "var(--outline-variant)" },
};

export function Badge({ children, colorClass, textColorClass, variant = "default" }: BadgeProps) {
    // Legacy support: if old colorClass/textColorClass are passed, use them
    if (colorClass || textColorClass) {
        return (
            <span
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${colorClass ?? ""} ${textColorClass ?? ""}`}
            >
                {children}
            </span>
        );
    }

    const v = BADGE_VARIANTS[variant];
    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
            style={{
                background: v.bg,
                color: v.color,
                border: `1px solid ${v.border}`
            }}
        >
            {children}
        </span>
    );
}

// ══════════════════════════════════════════════════════
// Confirm Dialog
// ══════════════════════════════════════════════════════
interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen, title, message, confirmLabel = "Eliminar", onConfirm, onCancel
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 ios-blur"
                style={{ background: "rgba(0,0,0,0.6)" }}
                onClick={onCancel}
            />
            <div
                className="relative max-w-sm w-full p-6 animate-scale-in"
                style={{
                    background: "var(--surface-container-high)",
                    border: "1px solid var(--outline-variant)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-lg)"
                }}
            >
                {/* Icon */}
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(255,113,108,0.1)" }}
                >
                    <AlertCircle size={22} style={{ color: "var(--error)" }} />
                </div>

                <h3 className="text-base font-bold mb-2" style={{ color: "var(--on-surface)" }}>
                    {title}
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                        style={{
                            background: "var(--surface-container)",
                            color: "var(--on-surface-variant)",
                            border: "1px solid var(--outline-variant)"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-bright)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-container)")}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
                        style={{
                            background: "rgba(255,113,108,0.9)",
                            boxShadow: "0 0 20px rgba(255,113,108,0.3)"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--error)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,113,108,0.9)")}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
