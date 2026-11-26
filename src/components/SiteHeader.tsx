import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";

async function Account() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        Sign in
      </Link>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontWeight: 600 }}>@{user.handle}</span>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn">Sign out</button>
      </form>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        diffed<span>.</span>
      </Link>
      <nav className="nav" aria-label="Main">
        <Link href="/">Templates</Link>
        <span className="muted" title="Coming soon">Feed</span>
        <span className="muted" title="Coming later">Rank-offs</span>
      </nav>
      <div style={{ marginLeft: "auto" }}>
        <Suspense fallback={<span className="muted">…</span>}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}
