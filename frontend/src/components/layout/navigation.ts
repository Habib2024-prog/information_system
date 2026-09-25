import type { LucideIcon } from "lucide-react";
import { Building2, ClipboardCheck, GraduationCap, LayoutDashboard, TableProperties, UsersRound } from "lucide-react";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { label: "داشبورد", path: "/", icon: LayoutDashboard },
  { label: "جدول عمومی", path: "/employees", icon: TableProperties },
  { label: "دیپارتمنت‌ها", path: "/departments", icon: Building2 },
  { label: "اعضای علمی", path: "/scientific-members", icon: GraduationCap },
  { label: "مشاهدات", path: "/observations", icon: ClipboardCheck },
  { label: "مکاتب", path: "/schools", icon: UsersRound },
];
