import { notFound } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/data/templates";
import { TierEditor } from "@/components/TierEditor";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const t = getTemplate(slug);
  return { title: t ? `${t.title} · Diffed` : "Diffed" };
}

export default async function TemplatePage(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const template = getTemplate(slug);
  if (!template) notFound();

  return (
    <main className="page">
      <TierEditor template={template} />
    </main>
  );
}
