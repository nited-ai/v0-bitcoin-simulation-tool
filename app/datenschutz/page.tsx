import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { operator } from "@/lib/operator";
import "@/src/modules/simulator/simulator.css";

export const metadata = { title: "Datenschutz | FireHODL" };

export default function Datenschutz() {
  return (
    <div className="fh-app">
      <article className="fh-methodik">
        <Link href="/">← Zurück zum Simulator</Link>
        <h1>Datenschutzhinweise</h1>
        <p>Stand: 23. September 2026</p>
        <h2>Verantwortlicher</h2>
        <p>
          {operator.name}, vertreten durch {operator.representative}
          <br />
          {operator.street}, {operator.city}, {operator.country}
          <br />
          E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
          <br />
          Telefon: <a href={operator.phoneHref}>{operator.phone}</a>
        </p>
        <h2>Simulation auf deinem Gerät</h2>
        <p>
          Der Simulator verarbeitet eingegebene Bestände, Sparraten, Entnahmen
          und Strategieparameter im Browser. Diese Angaben und die berechneten
          Ergebnisse werden von der Anwendung nicht an unseren Server oder einen
          KI-Dienst gesendet. Ein Benutzerkonto ist nicht erforderlich. Die
          Berechnung trifft keine Entscheidung mit rechtlicher Wirkung über
          dich.
        </p>
        <h2>Speichern, Dateien und Browserspeicher</h2>
        <p>
          Deine Parameter, Plattformkonfigurationen und der zuletzt geöffnete Tab werden automatisch
          im lokalen Browserspeicher abgelegt (Schlüssel mit „bitcoin-sim“ bzw. „bitcoin-simulation“).
          Modell-Presets können zusätzlich für die Dauer der Browsersitzung gespeichert werden.
          Diese Daten bleiben auf deinem Gerät. Andere Personen mit Zugriff auf dasselbe Browserprofil
          können sie ebenfalls sehen. Durch Löschen der Website-Daten entfernst du sie.
          Aus früheren Vorschauversionen können zusätzlich die Schlüssel „firehodl-snapshot-v1“
          und „firehodl-credit-profiles-v1“ vorhanden sein; sie werden von dieser Oberfläche nicht geladen.
        </p>
        <p>
          JSON- und CSV-Exporte speicherst du als lokale Dateien; deren
          Weitergabe und Löschung steuerst du selbst. Eine Darstellungspräferenz
          kann unter „theme“ im Browser gespeichert werden. Das lokale Speichern
          dient der von dir gewünschten Funktion (§ 25 Abs. 2 Nr. 2 TDDDG).
          Soweit personenbezogene Daten betroffen sind, erfolgt die Verarbeitung
          auf Grundlage unseres berechtigten Interesses an der Bereitstellung
          des von dir aufgerufenen Simulators (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <h2>Bereitstellung und technische Verbindungsdaten</h2>
        <p>
          Für das Hosting setzen wir Vercel Inc., 440 N Barranca Avenue #4133,
          Covina, CA 91723, USA ein. Beim Abruf werden technisch notwendige
          Daten wie IP-Adresse, Zeitpunkt, angefragte Adresse,
          Browserinformationen und gegebenenfalls die verweisende Seite
          verarbeitet. Dies dient der Auslieferung, Fehleranalyse und Abwehr von
          Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser
          Interesse ist ein sicherer und verfügbarer Betrieb. Ohne die
          Verbindungsdaten ist ein Seitenabruf technisch nicht möglich.
        </p>
        <p>
          Technische Protokolle werden nur so lange benötigt, wie dies für
          Betrieb, Fehlerklärung und Sicherheit erforderlich ist. Bei einem
          konkreten Sicherheitsvorfall kann eine längere Aufbewahrung zur
          Aufklärung oder Rechtsverfolgung erforderlich sein. Die konkrete
          Vorhaltung beim Hostinganbieter richtet sich nach den eingesetzten
          Diensten und deren Konfiguration.
        </p>
        <p>
          Bei Vercel können Daten auch außerhalb der EU, insbesondere in den
          USA, verarbeitet werden. Die Bedingungen zur Auftragsverarbeitung und
          zu internationalen Übermittlungen einschließlich
          Standardvertragsklauseln sind im{" "}
          <a href="https://vercel.com/legal/dpa">
            Vercel Data Processing Addendum
          </a>{" "}
          beschrieben. Weitere Informationen enthält die{" "}
          <a href="https://vercel.com/legal/privacy-notice">
            Datenschutzerklärung von Vercel
          </a>
          .
        </p>
        <h2>Kursdaten und externe Inhalte</h2>
        <p>
          Der Browser ruft öffentliche Bitcoin-Kursdaten über unseren Server ab.
          Externe Kursanbieter werden serverseitig angesprochen; die Anwendung
          übermittelt ihnen weder deine Simulationseingaben noch deine
          Browser-IP. Die dabei gespeicherten Kursreihen enthalten öffentliche
          Marktdaten. Schriftarten werden lokal ausgeliefert. Externe Links
          öffnen erst beim Anklicken die jeweilige Website.
        </p>
        <p>
          Die Anwendung bindet keine Werbe- oder Analyse-Tracker ein.
          Insbesondere sind Vercel Analytics, Google Analytics und Microsoft
          Clarity nicht eingebunden. Es findet kein Tracking deiner
          Strategieauswahl statt.
        </p>
        <h2>Kontakt per E-Mail</h2>
        <p>
          Schreibst du uns, verarbeiten wir deine Adresse, den
          Nachrichteninhalt, gegebenenfalls Anhänge und technische
          Zustellinformationen zur Bearbeitung der Anfrage. Für unser Postfach
          nutzen wir Google Workspace von Google Cloud EMEA Limited, 70 Sir John
          Rogerson’s Quay, Dublin 2, Irland. Auch eine Verarbeitung durch Google
          in den USA ist möglich. Einzelheiten zu den Schutzmaßnahmen und
          Standardvertragsklauseln stehen in den{" "}
          <a href="https://cloud.google.com/terms/data-processing-addendum/">
            Datenverarbeitungsbedingungen von Google
          </a>
          .
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen
          Anfragen, sonst Art. 6 Abs. 1 lit. f DSGVO mit dem Interesse, Anfragen
          zu beantworten. Nach Abschluss löschen wir die Korrespondenz, soweit
          keine gesetzlichen Aufbewahrungspflichten oder erforderliche Nachweise
          für Rechtsansprüche entgegenstehen (Art. 6 Abs. 1 lit. c
          beziehungsweise f DSGVO). Du musst uns keine Finanzdaten schicken, um
          den Simulator zu nutzen.
        </p>
        <h2>Deine Rechte</h2>
        <p>
          Unter den gesetzlichen Voraussetzungen hast du Rechte auf Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung und
          Datenübertragbarkeit. Du kannst einer Verarbeitung auf Grundlage von
          Art. 6 Abs. 1 lit. f DSGVO aus Gründen deiner besonderen Situation
          widersprechen. Eine gegebenenfalls erteilte Einwilligung kannst du
          jederzeit mit Wirkung für die Zukunft widerrufen. Wende dich dafür an
          die oben genannte Kontaktadresse.
        </p>
        <p>
          Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren,
          insbesondere am Ort deines Aufenthalts, deiner Arbeit oder des
          vermuteten Verstoßes. Für unseren Sitz ist die{" "}
          <a href="https://lfd.niedersachsen.de/">
            Landesbeauftragte für den Datenschutz Niedersachsen
          </a>{" "}
          zuständig. Lokale Simulationsstände können wir nicht von deinem Gerät
          löschen; das erledigst du über die Website-Daten in deinen
          Browsereinstellungen.
        </p>
      </article>
      <LegalFooter />
    </div>
  );
}
