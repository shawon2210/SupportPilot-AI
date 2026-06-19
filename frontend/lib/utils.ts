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
    case "owner": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "admin": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "agent": return "bg-green-500/10 text-green-400 border-green-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": case "ready": case "completed": case "succeeded": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "pending": case "processing": case "trialing": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "failed": case "error": case "canceled": case "cancelled": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "past_due": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}
