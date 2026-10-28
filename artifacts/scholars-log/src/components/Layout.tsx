import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, Calendar, Flame,
  BarChart2, BookOpen, Clock, AlarmClock, Settings,
  ChevronLeft, ChevronRight, Timer, GraduationCap, Menu, X,
  CreditCard, FileText, Trophy, Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetSettings } from "@workspace/api-client-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/week", label: "Week", icon: Calendar },
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
    ],
  },
  {
    label: "Study",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/focus", label: "Focus Timer", icon: Timer },
      { href: "/habits", label: "Habits", icon: Flame },
    ],
  },
  {
    label: "Academic",
    items: [
      { href: "/grades", label: "Grades", icon: GraduationCap },
      { href: "/deadlines", label: "Deadlines", icon: AlarmClock },
      { href: "/schedule", label: "Schedule", icon: Clock },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/accounts", label: "Accounts", icon: Wallet },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/flashcards", label: "Flashcards", icon: CreditCard },
      { href: "/notes", label: "Notes", icon: FileText },
      { href: "/badges", label: "Badges", icon: Trophy },
    ],
  },
];

// Bottom tab bar items (mobile only — most used)
const BOTTOM_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/deadlines", label: "Deadlines", icon: AlarmClock },
];

function NavItem({
  href, label, icon: Icon, isActive, collapsed, onClick
}: { href: string; label: string; icon: React.ElementType; isActive: boolean; collapsed: boolean; onClick?: () => void }) {
  return (
    <Link href={href}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all duration-150",
          collapsed && "justify-center px-0 py-2.5",
          isActive
            ? "bg-sidebar-primary/15 text-sidebar-primary"
            : "text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent"
        )}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-sidebar-primary")} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className={cn("whitespace-nowrap overflow-hidden font-medium", isActive && "text-sidebar-primary")}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
        )}
      </div>
    </Link>
  );
}

function SidebarContent({
  collapsed, location, userName, initials, onNavClick
}: { collapsed: boolean; location: string; userName: string; initials: string; onNavClick?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-primary-foreground" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="font-display font-bold text-sm text-sidebar-foreground leading-tight">Scholar's Log</p>
              <p className="text-[10px] text-sidebar-foreground/40 leading-tight">Student Dashboard</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1.5"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + User + Collapse (desktop only) */}
      <div className="border-t border-sidebar-border p-3 space-y-1 flex-shrink-0">
        <Link href="/settings">
          <div
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium overflow-hidden whitespace-nowrap"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Link>

        <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", collapsed && "justify-center px-0")}>
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0 ring-1 ring-primary/30">
            {initials}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-semibold text-sidebar-foreground/80 whitespace-nowrap" data-testid="text-username">{userName}</p>
                <p className="text-[10px] text-sidebar-foreground/35 whitespace-nowrap">Student</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();

  const settings = useGetSettings();
  const userName = settings.data?.userName ?? "Student";
  const initials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop sidebar (md+) ───────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 232 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col flex-shrink-0 bg-sidebar relative z-20 overflow-hidden"
        data-testid="sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          location={location}
          userName={userName}
          initials={initials}
        />
        {/* Collapse toggle */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors",
              collapsed && "justify-center px-0"
            )}
            data-testid="button-toggle-sidebar"
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <><ChevronLeft className="w-3.5 h-3.5" /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile drawer overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-sidebar md:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 text-sidebar-foreground/40 hover:text-sidebar-foreground/80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent
                collapsed={false}
                location={location}
                userName={userName}
                initials={initials}
                onNavClick={() => setDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background z-10 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-foreground/60 hover:text-foreground"
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Scholar's Log</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className=""
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border safe-area-pb">
          <div className="flex items-stretch h-16">
            {BOTTOM_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.href === "/" ? location === "/" : location.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className="flex-1">
                  <div className={cn(
                    "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                    {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-sidebar-primary" />}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
