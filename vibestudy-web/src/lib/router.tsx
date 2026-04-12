import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { NewLabPage } from "@/components/layout/new-lab-page";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { SettingsPage } from "@/components/layout/settings-page";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import { useProfileStore } from "@/stores/profile";

interface RouterContext {
  queryClient: QueryClient;
}

// Root — просто Outlet, без layout
const RootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

// Onboarding — без AppLayout
const OnboardingRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

// Все остальные роуты — через AppLayout
const AppRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: "app",
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const IndexRoute = createRoute({
  getParentRoute: () => AppRoute,
  path: "/",
  beforeLoad: () => {
    const { onboardingDone } = useProfileStore.getState();
    if (!onboardingDone) throw redirect({ to: "/onboarding" });
    throw redirect({ to: "/new" });
  },
});

const NewRoute = createRoute({
  getParentRoute: () => AppRoute,
  path: "/new",
  beforeLoad: () => {
    const { onboardingDone } = useProfileStore.getState();
    if (!onboardingDone) throw redirect({ to: "/onboarding" });
  },
  component: NewLabPage,
});

const WorkspaceRoute = createRoute({
  getParentRoute: () => AppRoute,
  path: "/workspace/$labId",
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId:     (search.sessionId     as string | undefined),
    directory:     (search.directory     as string | undefined),
    initialPrompt: (search.initialPrompt as string | undefined),
    system:        (search.system        as string | undefined),
  }),
  beforeLoad: () => {
    const { onboardingDone } = useProfileStore.getState();
    if (!onboardingDone) throw redirect({ to: "/onboarding" });
  },
  component: WorkspacePage,
});

const SettingsRoute = createRoute({
  getParentRoute: () => AppRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = RootRoute.addChildren([
  OnboardingRoute,
  AppRoute.addChildren([
    IndexRoute,
    NewRoute,
    WorkspaceRoute,
    SettingsRoute,
  ]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
