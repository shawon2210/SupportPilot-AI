import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "0 B";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "owner": return "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400";
    case "admin": return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";
    case "agent": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
    default: return "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": case "ready": case "completed": case "succeeded": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
    case "pending": case "processing": case "trialing": return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "failed": case "error": case "canceled": case "cancelled": return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";
    case "past_due": return "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400";
    default: return "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400";
  }
}
