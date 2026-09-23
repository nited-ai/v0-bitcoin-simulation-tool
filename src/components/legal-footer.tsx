import Link from "next/link";
import { operator } from "@/lib/operator";

export function LegalFooter({ className = "fh-footer" }: { className?: string }) {
  return (
    <footer className={className}>
      <span>firehodl · Bitcoin verstehen. Entscheidungen durchrechnen.</span>
      <Link href="/methodik">Methodik & Grenzen</Link>
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
      <a href={`mailto:${operator.email}`}>Kontakt</a>
      <span>USD · vor Steuern · keine Anlageberatung</span>
    </footer>
  );
}
