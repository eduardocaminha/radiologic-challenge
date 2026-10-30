import { Fragment, type ReactNode } from "react";
import type { LegalDocument as LegalDocumentData } from "@/lib/legal";

const INLINE = /(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+\.[\w.]+[\w]|https:\/\/[^\s)]+[^\s).,])/g;

function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-medium text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("https://")) {
      return <a key={index} href={part} className="underline underline-offset-4">{part}</a>;
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(part)) {
      return <a key={index} href={`mailto:${part}`} className="underline underline-offset-4">{part}</a>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

interface LegalDocumentProps {
  document: LegalDocumentData;
  versionLabel: string;
}

export function LegalDocument({ document, versionLabel }: LegalDocumentProps) {
  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-headline-lg sm:text-display-sm">{document.title}</h1>
        <p className="text-sm text-muted-foreground">
          {versionLabel} <time dateTime={document.version}>{document.version}</time>
        </p>
      </header>
      {document.blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index} id={block.id} className="mt-6 scroll-mt-6 text-title-lg">
              {block.text}
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="flex list-disc flex-col gap-2 pl-5 leading-7 text-muted-foreground">
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        return <p key={index} className="leading-7 text-muted-foreground">{renderInline(block.text)}</p>;
      })}
    </article>
  );
}
