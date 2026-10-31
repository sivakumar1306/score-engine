import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line py-8 text-center text-xs text-muted">
      <p className="text-sm">
        Developed by <span className="font-semibold text-gradient">{SITE.developer}</span>
      </p>
      <p className="mt-2">© {new Date().getFullYear()} {SITE.developer}. All rights reserved.</p>
    </footer>
  );
}
