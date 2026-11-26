import Link from "next/link";
import { TEMPLATES } from "@/data/templates";

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <h1>
          Rank it. Prove it. <span style={{ color: "var(--accent)" }}>Diff &apos;em.</span>
        </h1>
        <p className="muted" style={{ fontSize: 16, maxWidth: 560 }}>
          Tier lists with receipts. Pass a Larp Check to certify your picks, then see how far your taste is from
          everyone else&apos;s.
        </p>
      </section>

      <div className="card-grid">
        {TEMPLATES.map((t) => (
          <Link key={t.slug} href={`/t/${t.slug}`} className="card">
            <span className="badge">{t.category}</span>
            <h2>{t.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {t.items.length} items · {t.items.filter((i) => i.quiz).length} with Larp Check
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
