import { useState, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowDown01Icon,
  Brain01Icon,
  Cancel01Icon,
  CloudIcon,
  Folder01Icon,
  Search01Icon,
  Tick02Icon,
  Wifi01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConnectionStore } from "@/stores/connection";
import { useProfileStore } from "@/stores/profile";
import {
  useLocalSettingsStore,
  TEMPLATE_AGENTS,
  LIGHT_AGENTS,
  HEAVY_AGENTS,
} from "@/stores/local-settings";
import { useProviders } from "@/lib/opencode-client";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Hi } from "@/components/ui/hi";
import { cn } from "@/lib/utils";
import { parseSettingsTab } from "@/components/layout/settings-nav";

interface ModelOption {
  value: string;
  label: string;
  provider: string;
  providerId: string;
}

function ModelPicker({
  value,
  onChange,
  options,
  placeholder = "По умолчанию",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ModelOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.provider.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const grouped: Record<string, ModelOption[]> = {};
  for (const o of filtered) {
    if (!grouped[o.provider]) grouped[o.provider] = [];
    grouped[o.provider].push(o);
  }

  const current = options.find((o) => o.value === value);
  const displayLabel = current ? `${current.provider} / ${current.label}` : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <div className="flex w-full min-w-0 gap-1">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-auto min-h-9 min-w-0 flex-1 justify-between gap-2 px-3 py-2 font-normal shadow-xs",
              !current && "text-muted-foreground",
            )}
          >
            <span className="truncate">{displayLabel}</span>
            <Hi
              icon={ArrowDown01Icon}
              size={14}
              className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          </Button>
        </PopoverTrigger>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onChange("")}
          >
            <Hi icon={Cancel01Icon} size={14} />
          </Button>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        className="max-h-[min(24rem,70vh)] overflow-hidden p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Hi icon={Search01Icon} size={14} className="shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Поиск модели…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                !value ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {placeholder}
            </button>
            {Object.keys(grouped).length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Ничего не найдено</p>
            )}
            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider}>
                <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {provider}
                </p>
                {models.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      onChange(m.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      value === m.value ? "font-medium text-primary" : "",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    {value === m.value ? <Hi icon={Tick02Icon} size={14} className="shrink-0" /> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function useModelOptions() {
  const { data: providersData } = useProviders();
  const connected = useConnectionStore((s) => s.connection.connected);

  return useMemo(() => {
    if (!connected || !providersData) return [];

    const options: ModelOption[] = [];
    for (const p of providersData.all) {
      if (!(providersData.connected ?? []).includes(p.id)) continue;
      for (const [, m] of Object.entries(p.models)) {
        options.push({
          value: `${p.id}/${m.id}`,
          label: (m as { name?: string; id: string }).name || m.id,
          provider: p.name,
          providerId: p.id,
        });
      }
    }
    return options;
  }, [connected, providersData]);
}

function SectionProfile() {
  const { profile, setProfile, resetOnboarding } = useProfileStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    university: profile?.university ?? "",
    faculty: profile?.faculty ?? "",
    fullName: profile?.fullName ?? "",
    group: profile?.group ?? "",
    variantGroup: profile?.variantGroup ?? "",
    extraInfo: profile?.extraInfo ?? "",
  });
  const [saved, setSaved] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    setProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dirty =
    form.university !== (profile?.university ?? "") ||
    form.faculty !== (profile?.faculty ?? "") ||
    form.fullName !== (profile?.fullName ?? "") ||
    form.group !== (profile?.group ?? "") ||
    form.variantGroup !== (profile?.variantGroup ?? "") ||
    form.extraInfo !== (profile?.extraInfo ?? "");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Профиль</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Используется в отчётах и при выполнении лаб</p>
      </div>

      <div className="space-y-4">
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-name" className="text-sm font-medium">
              ФИО
            </FieldLabel>
          </div>
          <FieldContent>
            <Input
              id="pf-name"
              placeholder="Иванов Иван Иванович"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-uni" className="text-sm font-medium">
              Учебное заведение
            </FieldLabel>
          </div>
          <FieldContent>
            <Input
              id="pf-uni"
              placeholder="МГТУ им. Баумана"
              value={form.university}
              onChange={(e) => update("university", e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-fac" className="text-sm font-medium">
              Факультет / Институт
            </FieldLabel>
          </div>
          <FieldContent>
            <Input id="pf-fac" placeholder="ИУ" value={form.faculty} onChange={(e) => update("faculty", e.target.value)} />
          </FieldContent>
        </Field>
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-gr" className="text-sm font-medium">
              Группа
            </FieldLabel>
          </div>
          <FieldContent>
            <Input id="pf-gr" placeholder="ИУ5-41" value={form.group} onChange={(e) => update("group", e.target.value)} />
          </FieldContent>
        </Field>
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-var" className="text-sm font-medium">
              Вариант
            </FieldLabel>
            <FieldDescription className="text-xs">Номер варианта для всех работ</FieldDescription>
          </div>
          <FieldContent>
            <Input
              id="pf-var"
              placeholder="5"
              value={form.variantGroup}
              onChange={(e) => update("variantGroup", e.target.value)}
              className="max-w-[120px]"
            />
          </FieldContent>
        </Field>
        <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
          <div className="space-y-0.5 pt-2">
            <FieldLabel htmlFor="pf-extra" className="text-sm font-medium">
              Доп. информация
            </FieldLabel>
            <FieldDescription className="text-xs">AI учитывает при выполнении</FieldDescription>
          </div>
          <FieldContent>
            <Textarea
              id="pf-extra"
              placeholder="Например: код на C++17, комментарии на русском…"
              value={form.extraInfo}
              onChange={(e) => update("extraInfo", e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              rows={3}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!dirty && !saved} className="gap-2">
          {saved ? (
            <>
              <Hi icon={Tick02Icon} size={14} />
              Сохранено
            </>
          ) : (
            "Сохранить"
          )}
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            resetOnboarding();
            navigate({ to: "/onboarding" });
          }}
        >
          Пройти настройку заново
        </Button>
      </div>
    </div>
  );
}

function SectionLocal() {
  const { connection, connect, disconnect } = useConnectionStore();
  const {
    labsDirectory,
    setLabsDirectory,
    modelMode,
    setModelMode,
    lightModel,
    setLightModel,
    heavyModel,
    setHeavyModel,
    agentModels,
    setAgentModel,
    clearAgentModel,
  } = useLocalSettingsStore();

  const [baseUrl, setBaseUrl] = useState(connection.baseUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dirInput, setDirInput] = useState(labsDirectory);
  const [dirSaved, setDirSaved] = useState(false);

  const modelOptions = useModelOptions();

  async function handleConnect() {
    setIsConnecting(true);
    await connect(baseUrl);
    setIsConnecting(false);
  }

  function saveDir() {
    setLabsDirectory(dirInput.trim() || "~/vibestudy");
    setDirSaved(true);
    setTimeout(() => setDirSaved(false), 2000);
  }

  const dirDirty = dirInput.trim() !== labsDirectory;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Локальный режим</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">OpenCode запускается на вашем компьютере</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Подключение</p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="http://localhost:4096"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="min-w-0 flex-1 font-mono text-sm"
          />
          {connection.connected ? (
            <Button variant="outline" onClick={disconnect} className="shrink-0 gap-2">
              <Hi icon={Wifi01Icon} size={16} className="text-primary" />
              Отключить
            </Button>
          ) : (
            <Button onClick={() => void handleConnect()} disabled={isConnecting} className="shrink-0">
              {isConnecting ? "Подключение…" : "Подключить"}
            </Button>
          )}
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">При разработке:</p>
          <code className="block select-all rounded border bg-background px-3 py-2 font-mono text-xs">
            pnpm dev
          </code>
          <p className="text-xs font-medium text-muted-foreground">Только сервер OpenCode:</p>
          <code className="block select-all rounded border bg-background px-3 py-2 font-mono text-xs">
            pnpm exec opencode serve --port 4096 --cors http://localhost:5173
          </code>
        </div>
        {connection.connected && (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <Hi icon={Wifi01Icon} size={12} />
            Подключено к {connection.baseUrl}
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">Папка для лаб</p>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Hi
              icon={Folder01Icon}
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="~/vibestudy"
              value={dirInput}
              onChange={(e) => {
                setDirInput(e.target.value);
                setDirSaved(false);
              }}
              className="pl-8 font-mono text-sm"
            />
          </div>
          <Button
            variant={dirSaved ? "outline" : "default"}
            onClick={saveDir}
            disabled={!dirDirty && !dirSaved}
            className="shrink-0 gap-1.5"
          >
            {dirSaved ? (
              <>
                <Hi icon={Tick02Icon} size={14} />
                Сохранено
              </>
            ) : (
              "Сохранить"
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">Модели агентов</p>
          <ToggleGroup
            type="single"
            value={modelMode}
            onValueChange={(v) => {
              if (v === "simple" || v === "advanced") setModelMode(v as "simple" | "advanced");
            }}
            variant="outline"
            spacing={2}
          >
            <ToggleGroupItem value="simple" className="text-xs">
              Простой
            </ToggleGroupItem>
            <ToggleGroupItem value="advanced" className="text-xs">
              Сложный
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {!connection.connected ? (
          <p className="text-sm text-muted-foreground">Подключитесь к OpenCode, чтобы выбрать модели</p>
        ) : modelOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет подключённых провайдеров с моделями</p>
        ) : modelMode === "simple" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Лёгкая модель используется для verificator, writer, qa, study-material. Тяжёлая — для report, coder,
              math.
            </p>
            <div className="space-y-3">
              <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
                <div className="space-y-0.5 pt-2">
                  <FieldTitle>Лёгкая модель</FieldTitle>
                  <FieldDescription className="text-xs">{LIGHT_AGENTS.join(", ")}</FieldDescription>
                </div>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Hi icon={ZapIcon} size={16} className="shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <ModelPicker
                        value={lightModel}
                        onChange={setLightModel}
                        options={modelOptions}
                        placeholder="По умолчанию из opencode.json"
                      />
                    </div>
                  </div>
                </FieldContent>
              </Field>
              <Field className="grid grid-cols-[160px_1fr] items-start gap-4">
                <div className="space-y-0.5 pt-2">
                  <FieldTitle>Тяжёлая модель</FieldTitle>
                  <FieldDescription className="text-xs">{HEAVY_AGENTS.join(", ")}</FieldDescription>
                </div>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Hi icon={Brain01Icon} size={16} className="shrink-0 text-purple-500" />
                    <div className="min-w-0 flex-1">
                      <ModelPicker
                        value={heavyModel}
                        onChange={setHeavyModel}
                        options={modelOptions}
                        placeholder="По умолчанию из opencode.json"
                      />
                    </div>
                  </div>
                </FieldContent>
              </Field>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Выберите модель для каждого агента. «По умолчанию» — модель из opencode.json шаблона.
            </p>
            {TEMPLATE_AGENTS.map((agent) => (
              <div key={agent.name} className="grid grid-cols-[160px_1fr] items-center gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    {agent.weight === "heavy" ? (
                      <Hi icon={Brain01Icon} size={14} className="shrink-0 text-purple-500" />
                    ) : (
                      <Hi icon={ZapIcon} size={14} className="shrink-0 text-amber-500" />
                    )}
                    <p className="text-sm font-medium">{agent.label}</p>
                  </div>
                  <p className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">{agent.desc}</p>
                </div>
                <ModelPicker
                  value={agentModels[agent.name] ?? ""}
                  onChange={(v) => (v ? setAgentModel(agent.name, v) : clearAgentModel(agent.name))}
                  options={modelOptions}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCloud() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Облако</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Запуск лаб на серверах без установки OpenCode</p>
      </div>
      <ItemGroup>
        <Item variant="outline" size="sm">
          <ItemMedia variant="icon">
            <Hi icon={CloudIcon} size={18} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Подписка через Telegram Stars</ItemTitle>
            <ItemDescription>Выполнение лаб в облаке — в разработке</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button size="sm" variant="secondary" disabled>
              Скоро
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
    </div>
  );
}

export function SettingsPage() {
  const search = useSearch({ strict: false }) as { tab?: unknown };
  const tab = parseSettingsTab(search.tab);

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-xl">
          {tab === "profile" ? <SectionProfile /> : null}
          {tab === "local" ? <SectionLocal /> : null}
          {tab === "cloud" ? <SectionCloud /> : null}
        </div>
      </div>
    </ScrollArea>
  );
}
