import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  FileText,
  FolderUp,
  GitBranch,
  Sparkles,
  Paperclip,
  ArrowUp,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLabsStore } from "@/stores/labs";
import { useConnectionStore } from "@/stores/connection";
import { useProfileStore } from "@/stores/profile";
import { useCreateSession } from "@/lib/opencode-client";

type ImportType = "pdf" | "folder" | "github" | "template";

const importOptions: {
  type: ImportType;
  icon: typeof FileText;
  label: string;
  accept?: string;
}[] = [
  { type: "pdf",      icon: FileText,  label: "PDF методичка", accept: ".pdf" },
  { type: "folder",   icon: FolderUp,  label: "ZIP / Папка",   accept: ".zip" },
  { type: "github",   icon: GitBranch, label: "GitHub" },
  { type: "template", icon: Sparkles,  label: "С нуля" },
];

/** Build a system prompt that injects user profile context */
function buildSystemPrompt(
  profile: ReturnType<typeof useProfileStore.getState>["profile"]
): string {
  if (!profile) return "";
  const lines: string[] = [
    "Контекст студента:",
    `- ФИО: ${profile.fullName}`,
    `- Учебное заведение: ${profile.university}`,
    profile.faculty ? `- Факультет: ${profile.faculty}` : "",
    `- Группа: ${profile.group}`,
    profile.variantGroup ? `- Вариант: ${profile.variantGroup}` : "",
    profile.extraInfo ? `- Доп. инструкции: ${profile.extraInfo}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function NewLabPage() {
  const navigate = useNavigate();
  const addLab    = useLabsStore((s) => s.addLab);
  const updateLab = useLabsStore((s) => s.updateLab);
  const connected = useConnectionStore((s) => s.connection.connected);
  const profile   = useProfileStore((s) => s.profile);

  const createSession = useCreateSession();

  const [message,      setMessage]      = useState("");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [githubUrl,    setGithubUrl]    = useState("");
  const [isStarting,   setIsStarting]   = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (!selectedType) setSelectedType("pdf");
    }
    e.target.value = "";
  }

  async function handleStart() {
    if (isStarting) return;
    setIsStarting(true);

    // 1. Create lab entry immediately so it appears in the sidebar
    const labId = crypto.randomUUID();
    const labName = message.trim()
      ? message.trim().slice(0, 50)
      : attachedFile?.name.replace(/\.[^.]+$/, "") ?? "Новая лабораторная";

    addLab({
      id:         labId,
      name:       labName,
      importType: selectedType ?? "template",
      status:     "in_progress",
    });

    // 2. If OpenCode is connected — create a real session
    if (connected) {
      try {
        // Use home directory or cwd as default working dir
        const directory = "/tmp/vibestudy/" + labId;

        const session = await createSession.mutateAsync({
          title: labName,
          directory,
        });

        // 3. Build initial prompt text
        const systemPrompt = buildSystemPrompt(profile);
        let promptText = message.trim();
        if (!promptText && selectedType === "template") {
          promptText = "Создай структуру проекта lab_template для новой лабораторной работы.";
        }
        if (selectedType === "github" && githubUrl) {
          promptText = `Склонируй репозиторий ${githubUrl} и подготовь рабочее окружение.\n${promptText}`;
        }

        // Save session info to lab
        updateLab(labId, {
          sessionId: session.id,
          directory,
          name: session.title || labName,
        });

        navigate({
          to: "/workspace/$labId",
          params: { labId },
          search: { sessionId: session.id, directory, initialPrompt: promptText || undefined, system: systemPrompt || undefined },
        });
      } catch (err) {
        console.error("Failed to create OpenCode session:", err);
        // Fall through to workspace anyway — user can work offline
        navigate({ to: "/workspace/$labId", params: { labId }, search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined } });
      }
    } else {
      // Offline mode — just open workspace
      navigate({ to: "/workspace/$labId", params: { labId }, search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined } });
    }

    setIsStarting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canStart) handleStart();
    }
  }

  const canStart =
    message.trim().length > 0 ||
    attachedFile !== null ||
    selectedType === "template" ||
    (selectedType === "github" && githubUrl.trim().length > 0);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-4">

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Новая лабораторная</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Опишите задачу, прикрепите методичку или выберите способ импорта
          </p>
        </div>

        {/* Import type chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {importOptions.map((opt) => {
            const Icon = opt.icon;
            const active = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => {
                  if (opt.type === "pdf" || opt.type === "folder") {
                    setSelectedType(opt.type);
                    fileInputRef.current?.click();
                  } else {
                    setSelectedType(active ? null : opt.type);
                  }
                }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={selectedType === "folder" ? ".zip" : ".pdf"}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* GitHub URL */}
        {selectedType === "github" && (
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {/* Chat input box */}
        <div className="rounded-xl border bg-background shadow-sm">
          {attachedFile && (
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            placeholder="Опишите задачу лабораторной работы…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none rounded-none border-0 border-b bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
            rows={3}
          />

          <div className="flex items-center justify-between px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Прикрепить файл"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={!canStart || isStarting}
              onClick={handleStart}
            >
              {isStarting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Enter — отправить · Shift+Enter — перенос строки
          {!connected && (
            <span className="ml-2 text-amber-500">· Нет подключения к OpenCode</span>
          )}
        </p>
      </div>
    </div>
  );
}
