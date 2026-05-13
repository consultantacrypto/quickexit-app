import React from "react";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Formatare inline minimală: `code`, **bold** (bold poate conține `code`), *italic* pe fragmente de text. */
export function formatInlineMarkdown(text: string): React.ReactNode {
  const t = text.trim();
  if (t.startsWith("*") && t.endsWith("*") && t.length > 2 && !t.startsWith("**")) {
    return <em className="italic text-neutral-700">{formatInlineMarkdown(t.slice(1, -1))}</em>;
  }

  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const pushText = (raw: string) => {
    if (!raw) return;
    const out: React.ReactNode[] = [];
    let k = 0;
    const re = /\*([^*]+)\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) {
        out.push(<span key={`s-${k++}`} dangerouslySetInnerHTML={{ __html: escapeHtml(raw.slice(last, m.index)) }} />);
      }
      out.push(
        <em key={`em-${k++}`} className="italic text-neutral-700">
          {m[1]}
        </em>
      );
      last = m.index + m[0].length;
    }
    if (last < raw.length) {
      out.push(<span key={`s-${k++}`} dangerouslySetInnerHTML={{ __html: escapeHtml(raw.slice(last)) }} />);
    }
    if (out.length === 0) {
      parts.push(<span key={`t-${key++}`} dangerouslySetInnerHTML={{ __html: escapeHtml(raw) }} />);
    } else if (out.length === 1) {
      parts.push(<React.Fragment key={`t-${key++}`}>{out[0]}</React.Fragment>);
    } else {
      parts.push(
        <span key={`t-${key++}`}>
          {out}
        </span>
      );
    }
  };

  while (i < text.length) {
    const tick = text.indexOf("`", i);
    const bold = text.indexOf("**", i);

    let next = -1;
    let kind: "code" | "bold" | "none" = "none";
    if (tick >= 0 && (bold < 0 || tick < bold)) {
      next = tick;
      kind = "code";
    } else if (bold >= 0) {
      next = bold;
      kind = "bold";
    }

    if (next < 0) {
      pushText(text.slice(i));
      break;
    }

    pushText(text.slice(i, next));

    if (kind === "code") {
      const end = text.indexOf("`", next + 1);
      if (end < 0) {
        pushText(text.slice(next));
        break;
      }
      const inner = text.slice(next + 1, end);
      parts.push(
        <code key={`c-${key++}`} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.9em] font-mono">
          {inner}
        </code>
      );
      i = end + 1;
      continue;
    }

    const endBold = text.indexOf("**", next + 2);
    if (endBold < 0) {
      pushText(text.slice(next));
      break;
    }
    const inner = text.slice(next + 2, endBold);
    parts.push(
      <strong key={`b-${key++}`} className="font-bold text-black">
        {formatInlineMarkdown(inner)}
      </strong>
    );
    i = endBold + 2;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function parseTable(rows: string[]): React.ReactElement {
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const parsedRows = rows.map(cells);
  let bodyStart = 0;
  if (parsedRows.length >= 2) {
    const sepLine = rows[1].trim();
    if (sepLine.startsWith("|") && sepLine.includes("---")) {
      bodyStart = 2;
    }
  }

  const header = parsedRows[0] ?? [];
  const body = parsedRows.slice(bodyStart);

  return (
    <div className="my-4 overflow-x-auto rounded-xl border-2 border-black/20 bg-white">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-black bg-[#F7F4EC]">
            {header.map((h, idx) => (
              <th key={idx} className="border border-black/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-neutral-700">
                {formatInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="odd:bg-neutral-50/80">
              {r.map((c, ci) => (
                <td key={ci} className="border border-black/10 px-3 py-2 align-top text-neutral-800">
                  {formatInlineMarkdown(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isSpecialBlockStart(trimmed: string): boolean {
  if (!trimmed) return false;
  if (trimmed === "---") return true;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("|")) return true;
  if (trimmed.startsWith("- ")) return true;
  return false;
}

export function renderOperatorBriefMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed === "---") {
      out.push(<hr key={`hr-${blockKey++}`} className="my-8 border-0 border-t-2 border-black/15" />);
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      out.push(
        <h3 key={`h3-${blockKey++}`} className="mt-8 text-lg font-black uppercase tracking-tight text-black">
          {formatInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      out.push(
        <h2 key={`h2-${blockKey++}`} className="mt-10 border-b-2 border-black pb-2 text-xl font-black uppercase italic tracking-tight text-black">
          {formatInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      out.push(
        <h1 key={`h1-${blockKey++}`} className="mt-2 text-2xl font-black uppercase italic leading-tight text-black md:text-3xl">
          {formatInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(<React.Fragment key={`tbl-${blockKey++}`}>{parseTable(tableLines)}</React.Fragment>);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(
        <ul key={`ul-${blockKey++}`} className="my-4 list-disc space-y-2 pl-6 text-sm font-medium leading-relaxed text-neutral-800">
          {items.map((item, idx) => (
            <li key={idx}>{formatInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (isSpecialBlockStart(lines[i].trim())) break;
      para.push(lines[i]);
      i++;
    }
    const text = para.join(" ").trim();
    if (text) {
      out.push(
        <p key={`p-${blockKey++}`} className="my-3 text-sm font-medium leading-relaxed text-neutral-800 md:text-base">
          {formatInlineMarkdown(text)}
        </p>
      );
    }
  }

  return <div className="operator-brief-md space-y-1">{out}</div>;
}
