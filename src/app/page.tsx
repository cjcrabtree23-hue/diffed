import { Suspense } from "react";
import Link from "next/link";
import { getTemplates } from "@/lib/data";

async function TemplateGrid() {
  const templates = await getTemplates();
  if (templates.length === 0) return <p className="muted">No templates yet.</p>;
  return (
    <div className="card-grid">
      {templates.map((t) => (
        <Link key={t.slug} href={`/t/${t.slug}`} className="card">
          <span className="badge">{t.category}</span>
          <h2>{t.title}</h2>
          <p className="muted" style={{ margin: 0 }}>{t.itemCount} items</p>
        </Link>
      ))}
    </div>
  );
}

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
      <Suspense fallback={<p className="muted">Loading templates…</p>}>
        <TemplateGrid />
      </Suspense>
    </main>
  );
}
