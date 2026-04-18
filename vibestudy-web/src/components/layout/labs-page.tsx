import { Link } from "@tanstack/react-router";
import { Clock01Icon, FolderOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Hi } from "@/components/ui/hi";
import { useLabsStore } from "@/stores/labs";

export function LabsPage() {
  const labs = useLabsStore((s) => s.labs);

  return (
    <div className="flex h-full flex-col overflow-auto p-6 md:p-10">
      {labs.length === 0 ? (
        <Empty className="flex flex-1 flex-col justify-center border-0 py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Hi icon={FolderOpenIcon} size={20} />
            </EmptyMedia>
            <EmptyTitle>Нет лабораторных работ</EmptyTitle>
            <EmptyDescription>
              Список лаб в левой панели приложения. Создайте первую работу или
              импортируйте методичку.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/new">Создать лабу</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mx-auto max-w-lg space-y-2 text-muted-foreground">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Hi icon={Clock01Icon} size={18} />
            Список лаб
          </p>
          <p className="text-sm">
            Откройте лабораторную из боковой панели слева. Здесь — краткий
            обзор; основная работа в воркспейсе.
          </p>
        </div>
      )}
    </div>
  );
}
