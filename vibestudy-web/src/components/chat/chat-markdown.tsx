import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const assistantComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 flex flex-col gap-0.5 pl-4 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 flex flex-col gap-0.5 pl-4 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-medium">{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline underline-offset-2 hover:opacity-90" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em] text-foreground/90">
          {children}
        </code>
      );
    }
    return <code className="font-mono text-[11px] leading-snug">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md border bg-background/80 p-2 font-mono text-[11px] leading-snug">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-muted/50 px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
};

const workspaceAssistantComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-[13px] leading-[1.5] text-foreground">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 flex flex-col gap-1 pl-[1.1em] list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 flex flex-col gap-1 pl-[1.1em] list-decimal">{children}</ol>,
  li: ({ children }) => <li className="text-[13px] leading-[1.5] text-foreground">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 text-base font-semibold text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 text-sm font-semibold text-foreground">{children}</h2>,
  h3: ({ children }) => (
    <h3 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {children}
    </h3>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:opacity-90"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded px-[5px] py-px font-mono text-[12px] text-foreground bg-muted">
          {children}
        </code>
      );
    }
    return <code className="font-mono text-[12px] leading-snug">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="mb-0 mt-2 overflow-x-auto rounded-lg bg-muted p-2 font-mono text-[12px] leading-[1.45]">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 mt-2 border-l-2 border-primary px-2.5 py-2 text-[12px] text-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-0 border-t border-border" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-2 py-1 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1 align-top">{children}</td>
  ),
};

const userWorkspaceComponents: Components = {
  ...workspaceAssistantComponents,
  h3: ({ children }) => (
    <h3 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-background/55">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 text-[13px] leading-[1.5] text-background">{children}</p>,
  li: ({ children }) => <li className="text-[13px] text-background">{children}</li>,
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded px-[5px] py-px font-mono text-[12px] text-background bg-background/15">
          {children}
        </code>
      );
    }
    return <code className="font-mono text-[12px] text-background">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="mb-0 mt-2 overflow-x-auto rounded-lg bg-background/15 p-2 font-mono text-[12px] leading-[1.45] text-background">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 mt-2 border-l-2 border-background/45 px-2.5 py-2 text-[12px] text-background/90">
      {children}
    </blockquote>
  ),
};

export function ChatMarkdown({
  text,
  variant = "default",
  role = "assistant",
}: {
  text: string;
  variant?: "default" | "workspace";
  role?: "assistant" | "user";
}) {
  const components =
    variant === "workspace"
      ? role === "user"
        ? userWorkspaceComponents
        : workspaceAssistantComponents
      : assistantComponents;

  return (
    <div className={variant === "workspace" ? "assistant-md text-[13px] leading-relaxed" : "text-sm leading-relaxed"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
