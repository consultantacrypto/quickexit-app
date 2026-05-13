import path from "path";
import { readFile } from "fs/promises";
import OperatorBriefClient from "./OperatorBriefClient";

const BRIEF_RELATIVE = path.join("docs", "internal", "operator-briefs", "2026-05-12-regenerated.md");

export default async function OperatorBriefPage() {
  const briefPath = path.join(process.cwd(), BRIEF_RELATIVE);
  let initialContent = "";
  let readError: string | null = null;
  try {
    initialContent = await readFile(briefPath, "utf-8");
  } catch {
    readError = "Brief-ul demonstrativ nu a putut fi încărcat. Verifică că fișierul există în repo.";
  }

  return <OperatorBriefClient initialContent={initialContent} readError={readError} />;
}
