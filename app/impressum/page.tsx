import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { operator } from "@/lib/operator";
import "@/src/modules/simulator/simulator.css";

export const metadata = { title: "Impressum | FireHODL" };

export default function Impressum() {
  return (
    <div className="fh-app">
      <article className="fh-methodik">
        <Link href="/">← Zurück zum Simulator</Link>
        <h1>Impressum</h1>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {operator.name}<br />
          {operator.street}<br />
          {operator.city}<br />
          {operator.country}
        </p>
        <p>Vertreten durch den Geschäftsführer: {operator.representative}</p>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href={operator.phoneHref}>{operator.phone}</a><br />
          E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
        </p>
        <h2>Register und Umsatzsteuer</h2>
        <p>
          Registergericht: {operator.registryCourt}<br />
          Handelsregisternummer: {operator.registryNumber}<br />
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {operator.vatId}
        </p>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>
          {operator.representative}<br />
          {operator.street}<br />
          {operator.city}, {operator.country}
        </p>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <h2>Zum Simulator</h2>
        <p>
          FireHODL dient dem Vergleich hypothetischer Bitcoin-Investments.
          Ergebnisse sind keine Anlageberatung und keine Zusage zukünftiger
          Renditen. Annahmen und Grenzen stehen in der <Link href="/methodik">Methodik</Link>.
        </p>
      </article>
      <LegalFooter />
    </div>
  );
}
