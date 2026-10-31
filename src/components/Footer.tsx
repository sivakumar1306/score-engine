import { Heart } from "lucide-react";
import { SITE } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  const name = SITE.developerUrl ? (
    <a href={SITE.developerUrl} target="_blank" rel="noreferrer" className="font-semibold text-gradient hover:opacity-80">{SITE.developer}</a>
  ) : (
    <span className="font-semibold text-gradient">{SITE.developer}</span>
  );
  return (
    <footer className="border-t border-line py-8 text-center text-xs text-muted">
      <p className="flex items-center justify-center gap-1.5 text-sm">
        Developed with <Heart className="size-3.5 animate-pulse fill-hot text-hot" /> by {name}
      </p>
      <p className="mt-2">© {year > SITE.since ? `${SITE.since}–${year}` : year} {SITE.developer}. All rights reserved.</p>
      <p className="mt-1 opacity-70">Unofficial community tournament tracker. Not affiliated with Smash Karts.</p>
    </footer>
  );
}
