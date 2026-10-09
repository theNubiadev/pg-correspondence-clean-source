"use client";

import {
  Archive,
  Building2,
  Calendar,
  ChartColumnIncreasing,
  CheckCheck,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  Files,
  FileText,
  Forward,
  Inbox,
  LayoutDashboard,
  PenTool,
  PlusCircle,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  Undo2,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon registry.
 *
 * Navigation and workflow definitions live in plain data modules that must stay
 * importable on the server, so they reference icons by name. Mapping those names
 * here — rather than importing all of `lucide-react` dynamically — keeps the
 * client bundle to just the icons actually used.
 */
const ICONS: Record<string, LucideIcon> = {
  Archive,
  Building2,
  Calendar,
  ChartColumnIncreasing,
  CheckCheck,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  Files,
  FileText,
  Forward,
  Inbox,
  LayoutDashboard,
  PenTool,
  PlusCircle,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  Undo2,
  UserPlus,
  Users,
  XCircle,
};

export function NavIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Files;
  return <Icon className={className} aria-hidden="true" />;
}

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Files;
}
