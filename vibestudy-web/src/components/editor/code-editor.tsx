import { useEffect, useState, useCallback } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import { Loader2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileContent } from "@/lib/opencode-client";
import { useConnectionStore } from "@/stores/connection";
import { useTheme } from "@/hooks/use-theme";

// ── language detection ─────────────────────────────────────────────────────

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    py: "python",
    cpp: "cpp", cc: "cpp", cxx: "cpp", c: "c", h: "c", hpp: "cpp",
    rs: "rust",
    go: "go",
    java: "java",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sh: "shell", bash: "shell",
    json: "json",
    yaml: "yaml", yml: "yaml",
    toml: "ini",
    md: "markdown",
    typ: "markdown",   // Typst — no dedicated lang, markdown is closest
    html: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    xml: "xml",
    makefile: "makefile",
    dockerfile: "dockerfile",
  };
  if (ext === "makefile" || path.toLowerCase().endsWith("makefile")) return "makefile";
  if (path.toLowerCase().endsWith("dockerfile")) return "dockerfile";
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
  const client = useConnectionStore((s) => s.connection.client);

  const { data: remoteContent, isLoading } = useFileContent(directory, filePath);

  const [localContent, setLocalContent] = useState<string | undefined>(undefined);
  const [savedContent, setSavedContent] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // When remote content loads or filePath changes, reset local state
  useEffect(() => {
    if (remoteContent !== undefined) {
      setLocalContent(remoteContent);
      setSavedContent(remoteContent);
    }
  }, [remoteContent, filePath]);

  const isDirty = localContent !== undefined && localContent !== savedContent;

  // Monaco theme sync
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }, [monaco, theme]);

  // Save via OpenCode file write endpoint
  const handleSave = useCallback(async () => {
    if (!client || !isDirty || localContent === undefined) return;
    setIsSaving(true);
    try {
      // SDK doesn't expose a file.write — use fetch directly to the server
      const connection = useConnectionStore.getState().connection;
      const url = `${connection.baseUrl}/file`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory, path: filePath, content: localContent }),
      });
      setSavedContent(localContent);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save file:", e);
    } finally {
      setIsSaving(false);
    }
  }, [client, isDirty, localContent, directory, filePath]);

  // Ctrl+S / Cmd+S
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* File tab bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/20 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{fileName}</span>
          {isDirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Несохранённые изменения" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-xs"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {justSaved ? (
            <><Check className="h-3 w-3 text-green-500" />Сохранено</>
          ) : isSaving ? (
            <><Loader2 className="h-3 w-3 animate-spin" />Сохранение</>
          ) : (
            <><Save className="h-3 w-3" />Сохранить</>
          )}
        </Button>
      </div>

      {/* Monaco */}
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          value={localContent ?? ""}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          onChange={(val) => setLocalContent(val ?? "")}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
