import { useEffect, useState, useCallback } from "react";
import MonacoEditor, {
  useMonaco,
  type BeforeMount,
} from "@monaco-editor/react";
import {
  AlertCircleIcon,
  Loading03Icon,
  Tick02Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons";
import { Hi } from "@/components/ui/hi";
import { Button } from "@/components/ui/button";
import { useFileContent, qk } from "@/lib/opencode-client";
import { useConnectionStore } from "@/stores/connection";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";
import { defineVibestudyMonacoThemes, monacoThemeId } from "@/lib/monaco-theme";

// ── language detection ─────────────────────────────────────────────────────

function detectLanguage(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith("makefile") || lower.endsWith("gnumakefile"))
    return "makefile";
  if (lower.endsWith("dockerfile")) return "dockerfile";
  if (lower.endsWith("cmakelists.txt")) return "cmake";

  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    rs: "rust",
    go: "go",
    java: "java",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sh: "shell",
    bash: "shell",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    md: "markdown",
    typ: "markdown", // Typst — no dedicated lang
    html: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    xml: "xml",
  };
  return map[ext] ?? "plaintext";
}

// ── props ──────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  filePath: string;
  directory: string;
}

// ── component ──────────────────────────────────────────────────────────────

export function CodeEditor({ filePath, directory }: CodeEditorProps) {
  const { theme } = useTheme();
  const monaco = useMonaco();
  const baseUrl = useConnectionStore((s) => s.connection.baseUrl);
  const qc = useQueryClient();

  const { data: remoteContent, isLoading } = useFileContent(
    directory,
    filePath,
  );

  const [localContent, setLocalContent] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset when file changes or remote content loads
  useEffect(() => {
    const text = remoteContent ?? "";
    setLocalContent(text);
    setSavedContent(text);
    setSaveError(null);
  }, [remoteContent, filePath]);

  const isDirty = localContent !== savedContent;

  const handleBeforeMount: BeforeMount = (monaco) => {
    defineVibestudyMonacoThemes(monaco);
  };

  useEffect(() => {
    if (!monaco) return;
    defineVibestudyMonacoThemes(monaco);
    monaco.editor.setTheme(monacoThemeId(theme));
  }, [monaco, theme]);

  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      // OpenCode REST API: PUT /file/content with JSON body
      // (not in SDK types but available in the server)
      const res = await fetch(`${baseUrl}/file/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directory,
          path: filePath,
          content: localContent,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSavedContent(localContent);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      // Invalidate cached content
      qc.invalidateQueries({ queryKey: qk.fileContent(directory, filePath) });
    } catch (e) {
      console.error("Save failed:", e);
      setSaveError("Не удалось сохранить");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, baseUrl, directory, filePath, localContent, qc]);

  // Ctrl/Cmd+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const language = detectLanguage(filePath);
  const fileName = filePath.split("/").pop() ?? filePath;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <span className="inline-flex animate-spin text-muted-foreground">
          <Hi icon={Loading03Icon} size={22} />
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {fileName}
          </span>
          {isDirty && !saveError && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-amber-500"
              title="Несохранённые изменения"
            />
          )}
          {saveError && (
            <span className="flex items-center gap-1 font-sans text-xs text-destructive">
              <Hi icon={AlertCircleIcon} size={14} />
              {saveError}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1.5 px-2 font-sans text-xs text-foreground hover:bg-background"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          title="Сохранить (Ctrl+S)"
        >
          {justSaved ? (
            <>
              <Hi icon={Tick02Icon} size={16} className="text-emerald-600" />
              Сохранено
            </>
          ) : isSaving ? (
            <>
              <span className="inline-flex animate-spin">
                <Hi icon={Loading03Icon} size={16} />
              </span>
              Сохранение
            </>
          ) : (
            <>
              <Hi icon={FloppyDiskIcon} size={16} />
              Сохранить
            </>
          )}
        </Button>
      </div>

      {/* Monaco */}
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          value={localContent}
          theme={monacoThemeId(theme)}
          beforeMount={handleBeforeMount}
          onChange={(val) => setLocalContent(val ?? "")}
          options={{
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            renderWhitespace: "none",
            folding: true,
            lineNumbers: "on",
            glyphMargin: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
