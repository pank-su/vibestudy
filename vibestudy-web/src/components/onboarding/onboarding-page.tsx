import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  User,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useProfileStore, type UserProfile } from "@/stores/profile";

const STEPS = [
  { id: "university", label: "Учебное заведение", icon: GraduationCap },
  { id: "identity", label: "Ваши данные", icon: User },
  { id: "extra", label: "Доп. информация", icon: Settings2 },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);

  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState<Partial<UserProfile>>({});

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  function update(key: keyof UserProfile, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canNext(): boolean {
    if (step === 0) return !!form.university?.trim();
    if (step === 1) return !!(form.fullName?.trim() && form.group?.trim());
    return true;
  }

  function handleNext() {
    if (!canNext()) return;
    if (isLast) {
      completeOnboarding({
        university: form.university ?? "",
        faculty: form.faculty ?? "",
        group: form.group ?? "",
        fullName: form.fullName ?? "",
        variantGroup: form.variantGroup ?? "",
        extraInfo: form.extraInfo ?? "",
      });
      navigate({ to: "/new" });
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base">
            V
          </div>
          <span className="text-lg font-semibold">VibeStudy</span>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 aspect-square items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary text-primary"
                      : "border-2 border-border text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-px w-6 ${i < step ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-5">
          {step === 0 && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Ваш университет
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Эти данные будут использоваться при оформлении отчётов
                </p>
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="onb-university">
                    Учебное заведение *
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="onb-university"
                      placeholder="МГТУ им. Баумана"
                      value={form.university ?? ""}
                      onChange={(e) => update("university", e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && canNext() && handleNext()
                      }
                      autoFocus
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="onb-faculty">
                    Факультет / Институт
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="onb-faculty"
                      placeholder="ИУ (Информатика и системы управления)"
                      value={form.faculty ?? ""}
                      onChange={(e) => update("faculty", e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && canNext() && handleNext()
                      }
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Ваши данные
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  ФИО и учебная группа для титульных листов
                </p>
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="onb-fullname">ФИО *</FieldLabel>
                  <FieldContent>
                    <Input
                      id="onb-fullname"
                      placeholder="Иванов Иван Иванович"
                      value={form.fullName ?? ""}
                      onChange={(e) => update("fullName", e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && form.group?.trim() && handleNext()
                      }
                      autoFocus
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="onb-group">Группа *</FieldLabel>
                  <FieldContent>
                    <Input
                      id="onb-group"
                      placeholder="ИУ5-41"
                      value={form.group ?? ""}
                      onChange={(e) => update("group", e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && canNext() && handleNext()
                      }
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Дополнительно
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Необязательно — AI будет учитывать это при выполнении работ
                </p>
              </div>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="onb-variant">
                    Вариант по умолчанию
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="onb-variant"
                      placeholder="5"
                      value={form.variantGroup ?? ""}
                      onChange={(e) => update("variantGroup", e.target.value)}
                      autoFocus
                    />
                    <FieldDescription className="text-xs">
                      Номер варианта заданий, если он одинаковый для всех работ
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="onb-extra">Доп. информация</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="onb-extra"
                      placeholder="Например: преподаватель обычно требует комментарии на русском, код на C++17, отчёт в ГОСТ-стиле..."
                      value={form.extraInfo ?? ""}
                      onChange={(e) => update("extraInfo", e.target.value)}
                      className="min-h-[100px] resize-none text-sm"
                      rows={4}
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={isFirst}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            disabled={!canNext()}
            onClick={handleNext}
          >
            {isLast ? "Начать работу" : "Далее"}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Skip */}
        {!isLast && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={() => {
                completeOnboarding({
                  university: form.university ?? "",
                  faculty: form.faculty ?? "",
                  group: form.group ?? "",
                  fullName: form.fullName ?? "",
                  variantGroup: form.variantGroup ?? "",
                  extraInfo: form.extraInfo ?? "",
                });
                navigate({ to: "/new" });
              }}
            >
              Пропустить настройку
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
