import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getDictionary } from "@/lib/i18n/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <I18nProvider locale={locale} dict={dict}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            DBBS
          </span>
        </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </I18nProvider>
  );
}
