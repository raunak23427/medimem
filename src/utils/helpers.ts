import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function getDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getRunoutColor(days: number | null): string {
  if (days === null) return 'bg-gray-200';
  if (days > 7) return 'bg-green-500';
  if (days > 3) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'normal': return 'text-green-600 bg-green-50';
    case 'low': return 'text-orange-600 bg-orange-50';
    case 'high': return 'text-red-600 bg-red-50';
    case 'critical': return 'text-red-700 bg-red-100';
    case 'abnormal': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function getInsightStyles(type: string) {
  switch (type) {
    case 'urgent': return { bg: 'bg-red-50', border: 'border-red-500', icon: '🚨', iconBg: 'bg-red-100' };
    case 'warning': return { bg: 'bg-yellow-50', border: 'border-yellow-500', icon: '⚠️', iconBg: 'bg-yellow-100' };
    case 'positive': return { bg: 'bg-green-50', border: 'border-green-500', icon: '✅', iconBg: 'bg-green-100' };
    case 'reminder': return { bg: 'bg-blue-50', border: 'border-blue-500', icon: '🔔', iconBg: 'bg-blue-100' };
    default: return { bg: 'bg-gray-50', border: 'border-gray-400', icon: 'ℹ️', iconBg: 'bg-gray-100' };
  }
}

export function getDocTypeIcon(type: string): string {
  switch (type) {
    case 'lab_report': return '🧪';
    case 'prescription': return '💊';
    case 'discharge_summary': return '🏥';
    case 'imaging': return '📷';
    case 'vaccination': return '💉';
    default: return '📄';
  }
}

export function getDocTypeLabel(type: string): string {
  switch (type) {
    case 'lab_report': return 'Lab Report';
    case 'prescription': return 'Prescription';
    case 'discharge_summary': return 'Discharge Summary';
    case 'imaging': return 'Scan / Imaging';
    case 'vaccination': return 'Vaccination';
    default: return 'Other';
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
