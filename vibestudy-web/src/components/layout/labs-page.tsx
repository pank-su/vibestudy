import { FolderOpen, Plus, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";

interface Lab {
  id: string;
  name: string;
  status: "in_progress" | "completed";
  updatedAt: Date;
}

const mockLabs: Lab[] = [
  {
    id: "1",
    name: "Численные методы — Лаб. 3",
    status: "in_progress",
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "ООП — Лаб. 5",
    status: "completed",
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "3",
    name: "Линейная алгебра — Лаб. 2",
    status: "completed",
    updatedAt: new Date(Date.now() - 172800000),
  },
];

export function LabsPage() {
  const navigate = useNavigate();

  const inProgress = mockLabs.filter((l) => l.status === "in_progress");
  const completed = mockLabs.filter((l) => l.status === "completed");

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Мои лабораторные
          </h1>
          <p className="text-muted-foreground">
            Выполненные и в процессе выполнения
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate({ to: "/new" })}
        >
          <Plus className="h-4 w-4" />
          Новая лаба
        </Button>
      </div>

      {inProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Clock className="h-4 w-4" />
            В процессе
          </h2>
          <div className="grid gap-3">
            {inProgress.map((lab) => (
              <Card
                key={lab.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() =>
                  navigate({
                    to: "/workspace/$labId",
                    params: { labId: lab.id },
                    search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined },
                  })
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lab.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Обновлено{" "}
                        {lab.updatedAt.toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      В процессе
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4" />
            Выполненные
          </h2>
          <div className="grid gap-3">
            {completed.map((lab) => (
              <Card
                key={lab.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() =>
                  navigate({
                    to: "/workspace/$labId",
                    params: { labId: lab.id },
                    search: { sessionId: undefined, directory: undefined, initialPrompt: undefined, system: undefined },
                  })
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lab.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lab.updatedAt.toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {mockLabs.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Пока нет лабораторных работ
            </p>
            <Button onClick={() => navigate({ to: "/new" })}>
              Создать первую
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
