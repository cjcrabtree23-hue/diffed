import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getEditorData } from "@/lib/data";
import { TierEditor } from "@/components/TierEditor";

async function Editor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEditorData(slug);
  if (!data) notFound();
  return <TierEditor data={data} />;
}

export default function TemplatePage(props: PageProps<"/t/[slug]">) {
  return (
    <main className="page">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Editor params={props.params} />
      </Suspense>
    </main>
  );
}
