"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Database,
  HardDriveDownload,
  HardDriveUpload,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/layout/brand-mark";
import { useT } from "@/lib/i18n/client";

const NAV = [
  { key: "overview", href: "/dashboard", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderOpen },
  { key: "connections", href: "/connections", icon: Database },
  { key: "snapshots", href: "/snapshots", icon: HardDriveDownload },
  { key: "restore", href: "/restore", icon: HardDriveUpload },
];

export function AppSidebar() {
  const pathname = usePathname();
  const t = useT();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center px-1 group-data-[collapsible=icon]:justify-center">
          <BrandMark className="group-data-[collapsible=icon]:hidden" />
          <span className="hidden size-9 items-center justify-center rounded-[12px] bg-primary text-primary-foreground group-data-[collapsible=icon]:flex">
            <Database className="size-5" />
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.manage")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={t(`nav.${item.key}`)}
                  >
                    <item.icon />
                    <span>{t(`nav.${item.key}`)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isActive("/settings")}
              tooltip={t("nav.settings")}
            >
              <Settings />
              <span>{t("nav.settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
