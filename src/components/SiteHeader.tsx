import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        diffed<span>.</span>
      </Link>
      <nav className="nav" aria-label="Main">
        <Link href="/">Templates</Link>
        <span className="muted" title="Coming in Phase 1 with accounts">Feed</span>
        <span className="muted" title="Coming in Phase 3">Rank-offs</span>
      </nav>
    </header>
  );
}
