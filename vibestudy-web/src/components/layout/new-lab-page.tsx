import { useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  FileText,
  FolderUp,
  GitBranch,
  Sparkles,
  Paperclip,
  ArrowUp,
  X,
  Loader2,
  WifiOff,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLabsStore } from "@/stores/labs";
import { useConnectionStore } from "@/stores/connection";
import { useProfileStore } from "@/stores/profile";
import { useLocalSettingsStore, LIGHT_AGENTS, HEAVY_AGENTS } from "@/stores/local-settings";
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

const LAB_TEMPLATE_REPO = "https://github.com/pank-suai/lab_template";

/** Slugify lab name for directory */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",
        и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
        с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",
        ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "lab";
}

/** Build system prompt with student context */
function buildSystemPrompt(
  profile: ReturnType<typeof useProfileStore.getState>["profile"]
): string {
  if (!profile) return "";
  return [
    "Контекст студента:",
    profile.fullName     ? `- ФИО: ${profile.fullName}` : "",
    profile.university   ? `- Учебное заведение: ${profile.university}` : "",
    profile.faculty      ? `- Факультет: ${profile.faculty}` : "",
    profile.group        ? `- Группа: ${profile.group}` : "",
    profile.variantGroup ? `- Вариант: ${profile.variantGroup}` : "",
    profile.extraInfo    ? `- Доп. инструкции: ${profile.extraInfo}` : "",
  ].filter(Boolean).join("\n");
}

/** Build agent config overrides */
function buildAgentOverrides(
  modelMode: string,
  lightModel: string,
  heavyModel: string,
  agentModels: Record<string, string>
): Record<string, { model: string }> {
  const overrides: Record<string, { model: string }> = {};
  if (modelMode === "simple") {
    if (lightModel) for (const a of LIGHT_AGENTS) overrides[a] = { model: lightModel };
    if (heavyModel) for (const a of HEAVY_AGENTS) overrides[a] = { model: heavyModel };
  } else {
    for (const [agent, model] of Object.entries(agentModels)) {
      if (model) overrides[agent] = { model };
    }
  }
  return overrides;
}

export function NewLabPage() {
  const navigate   = useNavigate();
  const addLab     = useLabsStore((s) => s.addLab);
  const updateLab  = useLabsStore((s) => s.updateLab);
  const connected  = useConnectionStore((s) => s.connection.connected);
  const profile    = useProfileStore((s) => s.profile);
  const {
    labsDirectory, modelMode, lightModel, heavyModel, agentModels,
  } = useLocalSettingsStore();

  const createSession = useCreateSession();

  const [message,      setMessage]      = useState("");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [githubUrl,    setGithubUrl]    = useState("");
  const [isStarting,   setIsStarting]   = useState(false);
  const [startStatus,  setStartStatus]  = useState<string>("");
  const [error,        setError]        = useState<string | null>(null);

  // Preview of where the lab will be created (computed from labsDirectory + message)
  const previewPath = useMemo(() => {
    const base = (labsDirectory || "~/vibestudy").replace(/\/$/, "");
    const name  = message.trim().slice(0, 40) || "новая-лаба";
    const slug  = toSlug(name);
    return `${base}/${slug}-xxxxxxxx`;
  }, [labsDirectory, message]);

  const pdfInputRef    = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  // Keep a single ref for the paperclip button (defaults to pdf)
  const attachInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: ImportType) {
    const file = e.target.files?.[0];
    if (file) { setAttachedFile(file); setSelectedType(type); }
    e.target.value = "";
  }

  async function handleStart() {
    if (isStarting) return;
    setIsStarting(true);
    setStartStatus("Подготовка…");
    setError(null);

    // Auto-name: message > file name > "Лаба #N"
    const existingCount = useLabsStore.getState().labs.length + 1;
    const labName = message.trim()
      ? message.trim().slice(0, 60)
      : attachedFile
        ? attachedFile.name.replace(/\.[^.]+$/, "").slice(0, 60)
        : `Лаба #${existingCount}`;

    const labId = crypto.randomUUID();
    addLab({ id: labId, name: labName, importType: selectedType ?? "template", status: "in_progress" });

    if (!connected) {
      navigate({ to: "/workspace/$labId", params: { labId },
        search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined } });
      setIsStarting(false);
      return;
    }

    try {
      const client = useConnectionStore.getState().connection.client;
      if (!client) throw new Error("OpenCode клиент не инициализирован — переподключитесь в настройках");

      // ── Step 0: resolve home directory via path API ──────────────────────
      const pathRes  = await client.path.get();
      // API returns { home, state, config, worktree, directory }
      // "home" is the user home dir (~); "directory" is the opencode working dir
      const pathData = pathRes.data as { home?: string; directory?: string } | undefined;
      const homePath = pathData?.home ?? pathData?.directory ?? "/tmp";
      // Build absolute directory: replace leading ~ with resolved home
      const rawBase  = (labsDirectory || "~/vibestudy").replace(/\/$/, "");
      const absBase  = rawBase.startsWith("~/")
        ? `${homePath}/${rawBase.slice(2)}`
        : rawBase.startsWith("~")
          ? homePath
          : rawBase;
      const slug      = toSlug(labName);
      const shortId   = labId.slice(0, 8);
      const directory = `${absBase}/${slug}-${shortId}`;

      // ── Step 1: create directory and clone template via direct fetch ────
      // (avoids issues with client class methods)
      setStartStatus("Создание директории и клонирование шаблона…");
      const baseUrl = useConnectionStore.getState().connection.baseUrl.replace(/\/$/, "");

      const bsRes = await fetch(`${baseUrl}/session?directory=${encodeURIComponent(homePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `_setup_${shortId}` }),
      });
      if (!bsRes.ok) throw new Error(`Не удалось создать bootstrap-сессию: ${bsRes.status}`);
      const bootstrapSession = await bsRes.json() as { id: string };
      const bootstrapId = bootstrapSession.id;


      // Build setup command using absolute paths (no tilde needed)
      const setupCmd = selectedType === "github" && githubUrl.trim()
        ? [
            `mkdir -p "${directory}"`,
            `git clone "${githubUrl.trim()}" "${directory}"`,
            `git clone "${LAB_TEMPLATE_REPO}" "${directory}/_template"`,
            `cp -rn "${directory}/_template/docs" "${directory}/_template/.claude" "${directory}/_template/.opencode" "${directory}/_template/opencode.json" "${directory}/" 2>/dev/null || true`,
            `rm -rf "${directory}/_template"`,
          ].join(" && ")
        : [
            `mkdir -p "${directory}"`,
            `git clone "${LAB_TEMPLATE_REPO}" "${directory}"`,
          ].join(" && ");

      try {
        const shellRes = await fetch(
          `${baseUrl}/session/${bootstrapId}/shell?directory=${encodeURIComponent(homePath)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent: "general", command: setupCmd }),
          }
        );
        if (!shellRes.ok) {
          const errBody = await shellRes.text();
          throw new Error(`shell вернул ${shellRes.status}: ${errBody}`);
        }
        await shellRes.json(); // consume body
      } catch (shellErr) {
        console.error("Shell setup failed:", shellErr);
        throw new Error(`Не удалось создать директорию: ${shellErr instanceof Error ? shellErr.message : shellErr}`);
      } finally {
        // Clean up bootstrap session (best-effort)
        fetch(`${baseUrl}/session/${bootstrapId}`, { method: "DELETE" }).catch(() => {});
      }

      // ── Step 2: create the real working session with the existing directory ─
      setStartStatus("Открытие рабочей сессии…");
      const session = await createSession.mutateAsync({ title: labName, directory });

      // ── Step 2: apply agent model overrides via config.update ────────────
      const overrides = buildAgentOverrides(modelMode, lightModel, heavyModel, agentModels);
      if (Object.keys(overrides).length > 0) {
        try {
          const cfgRes = await client.config.get({ query: { directory } });
          const currentCfg    = (cfgRes.data ?? {}) as Record<string, unknown>;
          const currentAgents = (currentCfg.agent ?? {}) as Record<string, Record<string, unknown>>;
          const mergedAgents: Record<string, unknown> = { ...currentAgents };
          for (const [name, override] of Object.entries(overrides)) {
            mergedAgents[name] = { ...(currentAgents[name] ?? {}), ...override };
          }
          await client.config.update({
            body: { ...currentCfg, agent: mergedAgents } as never,
            query: { directory },
          });
        } catch (e) {
          console.warn("Agent config update failed (non-fatal):", e);
        }
      }

      // ── Step 3: build user-facing initial prompt (clean, no bash) ────────
      const systemPrompt = buildSystemPrompt(profile);
      let promptText = message.trim();

      if (!promptText) {
        if (selectedType === "pdf" && attachedFile) {
          promptText = `Методичка: ${attachedFile.name}\n\nВыполни лабораторную работу по методичке. Используй агента @report.`;
        } else if (selectedType === "github" && githubUrl.trim()) {
          promptText = `Репозиторий склонирован: ${githubUrl.trim()}\n\nПодготовь рабочее окружение и жди инструкций.`;
        } else {
          promptText = `Шаблон лабораторной работы готов. Жди методичку или инструкции от пользователя.`;
        }
      }

      updateLab(labId, { sessionId: session.id, directory, name: session.title || labName });

      navigate({
        to: "/workspace/$labId",
        params: { labId },
        search: {
          sessionId: session.id,
          directory,
          initialPrompt: promptText,
          system: systemPrompt || undefined,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to start lab:", msg, err);
      setError(`Ошибка: ${msg}`);
      // Don't navigate away — let user see the error and retry
    } finally {
      setIsStarting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canStart) handleStart(); }
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

        {/* Import chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {importOptions.map((opt) => {
            const Icon = opt.icon;
            const active = selectedType === opt.type;
            return (
              <button key={opt.type}
                onClick={() => {
                  if (opt.type === "pdf") {
                    pdfInputRef.current?.click();
                  } else if (opt.type === "folder") {
                    folderInputRef.current?.click();
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
                <Icon className="h-3.5 w-3.5" />{opt.label}
              </button>
            );
          })}
        </div>

        {/* Dedicated hidden inputs — each has the correct fixed accept */}
        <input ref={pdfInputRef}    type="file" accept=".pdf"      className="hidden"
          onChange={(e) => handleFileChange(e, "pdf")} />
        <input ref={folderInputRef} type="file" accept=".zip"      className="hidden"
          onChange={(e) => handleFileChange(e, "folder")} />
        {/* Paperclip fallback: accepts both */}
        <input ref={attachInputRef} type="file" accept=".pdf,.zip" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const type: ImportType = file.name.endsWith(".zip") ? "folder" : "pdf";
              handleFileChange(e, type);
            }
          }} />

        {selectedType === "github" && (
          <input type="text" placeholder="https://github.com/user/repo"
            value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        )}

        {/* Input box */}
        <div className="rounded-xl border bg-background shadow-sm">
          {attachedFile && (
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Textarea
            placeholder="Опишите задачу лабораторной работы…"
            value={message} onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none rounded-none border-0 border-b bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
            rows={3}
          />

          <div className="flex items-center justify-between px-3 py-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => attachInputRef.current?.click()} title="Прикрепить файл (PDF или ZIP)">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-8 w-8 rounded-lg"
              disabled={!canStart || isStarting} onClick={handleStart}>
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Enter — отправить · Shift+Enter — перенос строки
          </p>
          {!connected && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-amber-500">
              <WifiOff className="h-3 w-3" />
              OpenCode не подключён — лаба откроется в офлайн-режиме
            </p>
          )}
          {connected && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
              <FolderOpen className="h-3 w-3 shrink-0" />
              <span className="font-mono truncate max-w-xs" title={previewPath}>{previewPath}</span>
              <Link to="/settings" className="shrink-0 underline underline-offset-2 hover:text-foreground transition-colors">
                изменить
              </Link>
            </p>
          )}
          {isStarting && startStatus && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {startStatus}
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
