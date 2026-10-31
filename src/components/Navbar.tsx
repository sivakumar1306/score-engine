"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Menu, Plus, Settings, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { KartAvatar } from "./KartAvatar";
import { LinkButton } from "./ui";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/players", label: "Players" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    setMobile(false);
    setMenu(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const logout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", scrolled ? "border-b border-line bg-bg/70 backdrop-blur-xl" : "border-b border-transparent")}>
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="hidden flex-1 md:block" />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={cn("relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", isActive(l.href) ? "text-ink" : "text-muted hover:text-ink")}>
              {isActive(l.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-white/[0.07]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          {loading ? (
            <div className="skeleton h-9 w-28" />
          ) : user ? (
            <>
              <LinkButton href="/tournaments/new" size="sm" variant="outline">
                <Plus className="size-4" /> Host
              </LinkButton>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu((m) => !m)} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/[0.03] py-1 pl-1 pr-2.5 transition hover:bg-white/[0.07]">
                  <KartAvatar url={profile?.kart_url} name={profile?.username ?? "?"} size={30} className="rounded-lg" />
                  <span className="max-w-28 truncate text-sm font-medium">{profile?.username ?? "Player"}</span>
                  <ChevronDown className={cn("size-4 text-muted transition-transform", menu && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {menu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="glass absolute right-0 mt-2 w-52 origin-top-right overflow-hidden rounded-xl bg-surface/95 p-1.5 shadow-2xl"
                    >
                      <MenuLink href={profile ? `/players/${encodeURIComponent(profile.username)}` : "/settings"} icon={<Trophy className="size-4" />}>My stats</MenuLink>
                      <MenuLink href="/settings" icon={<Settings className="size-4" />}>Settings</MenuLink>
                      <button onClick={logout} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-hot transition hover:bg-hot/10">
                        <LogOut className="size-4" /> Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
              <LinkButton href="/signup" size="sm">Sign up</LinkButton>
            </>
          )}
        </div>

        <div className="md:hidden" />
        <button className="grid size-10 cursor-pointer place-items-center rounded-xl border border-line md:hidden" onClick={() => setMobile((m) => !m)} aria-label="Menu">
          {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={cn("block rounded-lg px-3 py-2.5 font-medium", isActive(l.href) ? "bg-white/[0.07]" : "text-muted")}>
                  {l.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-line" />
              {user ? (
                <>
                  <Link href="/tournaments/new" className="block rounded-lg px-3 py-2.5 font-medium text-muted">Host a tournament</Link>
                  <Link href="/settings" className="block rounded-lg px-3 py-2.5 font-medium text-muted">Settings</Link>
                  <button onClick={logout} className="block w-full rounded-lg px-3 py-2.5 text-left font-medium text-hot">Log out</button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <LinkButton href="/login" variant="outline" className="flex-1">Log in</LinkButton>
                  <LinkButton href="/signup" className="flex-1">Sign up</LinkButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/85 transition hover:bg-white/[0.06] hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}
