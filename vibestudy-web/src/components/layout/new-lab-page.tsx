import { useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowUp01Icon,
  Attachment01Icon,
  Cancel01Icon,
  File01Icon,
  FolderOpenIcon,
  FolderUploadIcon,
  GitBranchIcon,
  Loading03Icon,
  Pdf01Icon,
  SparklesIcon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useLabsStore } from "@/stores/labs";
import { useConnectionStore } from "@/stores/connection";
import { useProfileStore } from "@/stores/profile";
import { useLocalSettingsStore, LIGHT_AGENTS, HEAVY_AGENTS } from "@/stores/local-settings";
import { useCreateSession } from "@/lib/opencode-client";
import { Hi } from "@/components/ui/hi";
import { cn } from "@/lib/utils";

type ImportType = "pdf" | "folder" | "github" | "template";

const importOptions: {
  type: ImportType;
  icon: typeof File01Icon;
  label: string;
  accept?: string;
}[] = [
  { type: "pdf", icon: Pdf01Icon, label: "PDF методичка", accept: ".pdf" },
  { type: "folder", icon: FolderUploadIcon, label: "ZIP / Папка", accept: ".zip" },
  { type: "github", icon: GitBranchIcon, label: "GitHub" },
  { type: "template", icon: SparklesIcon, label: "С нуля" },
];

const LAB_TEMPLATE_REPO = "https://github.com/pank-suai/lab_template";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "yo",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "h",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "sch",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya",
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "lab";
}

function buildSystemPrompt(
  profile: ReturnType<typeof useProfileStore.getState>["profile"],
): string {
  if (!profile) return "";
  return [
    "Контекст студента:",
    profile.fullName ? `- ФИО: ${profile.fullName}` : "",
    profile.university ? `- Учебное заведение: ${profile.university}` : "",
    profile.faculty ? `- Факультет: ${profile.faculty}` : "",
    profile.group ? `- Группа: ${profile.group}` : "",
    profile.variantGroup ? `- Вариант: ${profile.variantGroup}` : "",
    profile.extraInfo ? `- Доп. инструкции: ${profile.extraInfo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAgentOverrides(
  modelMode: string,
  lightModel: string,
  heavyModel: string,
  agentModels: Record<string, string>,
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
  const navigate = useNavigate();
  const addLab = useLabsStore((s) => s.addLab);
  const updateLab = useLabsStore((s) => s.updateLab);
  const connected = useConnectionStore((s) => s.connection.connected);
  const profile = useProfileStore((s) => s.profile);
  const { labsDirectory, modelMode, lightModel, heavyModel, agentModels } = useLocalSettingsStore();

  const createSession = useCreateSession();

  const [message, setMessage] = useState("");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startStatus, setStartStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const previewPath = useMemo(() => {
    const base = (labsDirectory || "~/vibestudy").replace(/\/$/, "");
    const name = message.trim().slice(0, 40) || "новая-лаба";
    const slug = toSlug(name);
    return `${base}/${slug}-xxxxxxxx`;
  }, [labsDirectory, message]);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: ImportType) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setSelectedType(type);
    }
    e.target.value = "";
  }

  async function handleStart() {
    if (isStarting) return;
    setIsStarting(true);
    setStartStatus("Подготовка…");
    setError(null);

    const existingCount = useLabsStore.getState().labs.length + 1;
    const labName = message.trim()
      ? message.trim().slice(0, 60)
      : attachedFile
        ? attachedFile.name.replace(/\.[^.]+$/, "").slice(0, 60)
        : `Лаба #${existingCount}`;

    const labId = crypto.randomUUID();
    addLab({
      id: labId,
      name: labName,
      importType: selectedType ?? "template",
      status: "in_progress",
    });

    if (!connected) {
      navigate({
        to: "/workspace/$labId",
        params: { labId },
        search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined },
      });
      setIsStarting(false);
      return;
    }

    try {
      const client = useConnectionStore.getState().connection.client;
      if (!client) throw new Error("OpenCode клиент не инициализирован — переподключитесь в настройках");

      const pathRes = await client.path.get();
      const pathData = pathRes.data as { home?: string; directory?: string } | undefined;
      const homePath = pathData?.home ?? pathData?.directory ?? "/tmp";
      const rawBase = (labsDirectory || "~/vibestudy").replace(/\/$/, "");
      const absBase = rawBase.startsWith("~/")
        ? `${homePath}/${rawBase.slice(2)}`
        : rawBase.startsWith("~")
          ? homePath
          : rawBase;
      const slug = toSlug(labName);
      const shortId = labId.slice(0, 8);
      const directory = `${absBase}/${slug}-${shortId}`;

      setStartStatus("Создание директории и клонирование шаблона…");
      const baseUrl = useConnectionStore.getState().connection.baseUrl.replace(/\/$/, "");

      const bsRes = await fetch(`${baseUrl}/session?directory=${encodeURIComponent(homePath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `_setup_${shortId}` }),
      });
      if (!bsRes.ok) throw new Error(`Не удалось создать bootstrap-сессию: ${bsRes.status}`);
      const bootstrapSession = (await bsRes.json()) as { id: string };
      const bootstrapId = bootstrapSession.id;

      const setupCmd =
        selectedType === "github" && githubUrl.trim()
          ? [
              `mkdir -p "${directory}"`,
              `git clone "${githubUrl.trim()}" "${directory}"`,
              `git clone "${LAB_TEMPLATE_REPO}" "${directory}/_template"`,
              `cp -rn "${directory}/_template/docs" "${directory}/_template/.claude" "${directory}/_template/.opencode" "${directory}/_template/opencode.json" "${directory}/" 2>/dev/null || true`,
              `rm -rf "${directory}/_template"`,
            ].join(" && ")
          : [`mkdir -p "${directory}"`, `git clone "${LAB_TEMPLATE_REPO}" "${directory}"`].join(" && ");

      try {
        const shellRes = await fetch(
          `${baseUrl}/session/${bootstrapId}/shell?directory=${encodeURIComponent(homePath)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent: "general", command: setupCmd }),
          },
        );
        if (!shellRes.ok) {
          const errBody = await shellRes.text();
          throw new Error(`shell вернул ${shellRes.status}: ${errBody}`);
        }
        await shellRes.json();
      } catch (shellErr) {
        console.error("Shell setup failed:", shellErr);
        throw new Error(
          `Не удалось создать директорию: ${shellErr instanceof Error ? shellErr.message : shellErr}`,
        );
      } finally {
        fetch(`${baseUrl}/session/${bootstrapId}`, { method: "DELETE" }).catch(() => {});
      }

      setStartStatus("Открытие рабочей сессии…");
      const session = await createSession.mutateAsync({ title: labName, directory });

      const overrides = buildAgentOverrides(modelMode, lightModel, heavyModel, agentModels);
      if (Object.keys(overrides).length > 0) {
        try {
          const cfgRes = await client.config.get({ query: { directory } });
          const currentCfg = (cfgRes.data ?? {}) as Record<string, unknown>;
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
    } finally {
      setIsStarting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canStart) void handleStart();
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

        <div className="flex flex-wrap justify-center gap-2">
          {importOptions.map((opt) => {
            const active = selectedType === opt.type;
            return (
              <Button
                key={opt.type}
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                className={cn("gap-2 rounded-full", active && "border-primary/40")}
                onClick={() => {
                  if (opt.type === "pdf") {
                    pdfInputRef.current?.click();
                  } else if (opt.type === "folder") {
                    folderInputRef.current?.click();
                  } else {
                    setSelectedType(active ? null : opt.type);
                  }
                }}
              >
                <Hi icon={opt.icon} size={14} />
                {opt.label}
              </Button>
            );
          })}
        </div>

        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFileChange(e, "pdf")}
        />
        <input
          ref={folderInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => handleFileChange(e, "folder")}
        />
        <input
          ref={attachInputRef}
          type="file"
          accept=".pdf,.zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const type: ImportType = file.name.endsWith(".zip") ? "folder" : "pdf";
              handleFileChange(e, type);
            }
          }}
        />

        {selectedType === "github" && (
          <Input
            type="url"
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full"
          />
        )}

        <InputGroup className="h-auto w-full flex-col rounded-2xl border border-border bg-background shadow-sm">
          {attachedFile && (
            <InputGroupAddon
              align="block-start"
              className="w-full justify-between gap-2 border-b border-border"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">
                <Hi icon={File01Icon} size={16} className="shrink-0 text-muted-foreground" />
                {attachedFile.name}
              </span>
              <InputGroupButton
                size="icon-sm"
                variant="ghost"
                onClick={() => setAttachedFile(null)}
                type="button"
              >
                <Hi icon={Cancel01Icon} size={14} />
              </InputGroupButton>
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            placeholder="Опишите задачу лабораторной работы…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] px-4 text-sm"
            rows={3}
          />
          <InputGroupAddon align="block-end" className="flex w-full flex-row justify-between border-t border-border">
            <InputGroupButton
              size="icon-sm"
              variant="ghost"
              onClick={() => attachInputRef.current?.click()}
              title="Прикрепить файл (PDF или ZIP)"
              type="button"
            >
              <Hi icon={Attachment01Icon} size={18} />
            </InputGroupButton>
            <InputGroupButton
              size="icon-sm"
              variant="default"
              className="rounded-lg"
              disabled={!canStart || isStarting}
              onClick={() => void handleStart()}
              type="button"
            >
              {isStarting ? (
                <Hi icon={Loading03Icon} size={18} className="animate-spin" />
              ) : (
                <Hi icon={ArrowUp01Icon} size={18} />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <div className="space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Enter — отправить · Shift+Enter — перенос строки
          </p>
          {!connected && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-amber-500">
              <Hi icon={WifiDisconnected01Icon} size={14} />
              OpenCode не подключён — лаба откроется в офлайн-режиме
            </p>
          )}
          {connected && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
              <Hi icon={FolderOpenIcon} size={14} className="shrink-0" />
              <span className="max-w-xs truncate font-mono" title={previewPath}>
                {previewPath}
              </span>
              <Link
                to="/settings"
                search={{ tab: "local" }}
                className="shrink-0 underline underline-offset-2 transition-colors hover:text-foreground"
              >
                изменить
              </Link>
            </p>
          )}
          {isStarting && startStatus && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Hi icon={Loading03Icon} size={14} className="animate-spin" />
              {startStatus}
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
