import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import AiChat from "@/components/AiChat";
import OfflineBanner from "@/components/OfflineBanner";
import NotificationPrompt from "@/components/NotificationPrompt";
import NotificationSetup from "@/components/NotificationSetup";
import { usePWA } from "@/hooks/usePWA";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Habits from "@/pages/Habits";
import Grades from "@/pages/Grades";
import Deadlines from "@/pages/Deadlines";
import Week from "@/pages/Week";
import Analytics from "@/pages/Analytics";
import Schedule from "@/pages/Schedule";
import Focus from "@/pages/Focus";
import Settings from "@/pages/Settings";
import Flashcards from "@/pages/Flashcards";
import Notes from "@/pages/Notes";
import Badges from "@/pages/Badges";
import Login from "@/pages/Login";
import Accounts from "@/pages/Accounts";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,        // Don't retry failed requests — show app immediately on API error
      staleTime: 30000,
    },
  },
});

function PWALayer() {
  const { isOnline, notifPerm, requestNotificationPermission, schedulePrayerNotifications, scheduleTaskNotifications } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return undefined;
    if (Notification.permission === "default") {
      const t = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  async function handleAllow() {
    setShowPrompt(false);
    await requestNotificationPermission();
  }

  return (
    <>
      <OfflineBanner />
      <AnimatePresence>
        {showPrompt && (
          <NotificationPrompt
            onAllow={handleAllow}
            onDismiss={() => setShowPrompt(false)}
          />
        )}
      </AnimatePresence>
      <NotificationSetup
        schedulePrayerNotifications={schedulePrayerNotifications}
        scheduleTaskNotifications={scheduleTaskNotifications}
        notifPerm={notifPerm}
      />
    </>
  );
}

function AppContent() {
  const { data: settings, isLoading, isError } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Resolve onboarding state whenever loading finishes
  useEffect(() => {
    if (isLoading) return;
    if (settings) {
      const isDefault = settings.userName === "Student" || !settings.userName;
      setOnboarded(!isDefault);
    } else {
      // API unavailable (offline / server error) — show login so user can still use the app
      setOnboarded(false);
    }
  }, [settings, isLoading, isError]);

  // Hard safety net: if somehow still loading after 10s, exit to login
  useEffect(() => {
    const t = setTimeout(() => {
      setOnboarded((prev) => (prev === null ? false : prev));
    }, 10000);
    return () => clearTimeout(t);
  }, []);

  // Loading splash
  if (isLoading || onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[slide_1s_ease-in-out_infinite]" style={{ width: "50%" }} />
          </div>
        </div>
      </div>
    );
  }

  // Show login/onboarding for new users
  if (!onboarded) {
    return <Login onComplete={() => setOnboarded(true)} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/habits" component={Habits} />
        <Route path="/grades" component={Grades} />
        <Route path="/deadlines" component={Deadlines} />
        <Route path="/week" component={Week} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/focus" component={Focus} />
        <Route path="/settings" component={Settings} />
        <Route path="/flashcards" component={Flashcards} />
        <Route path="/notes" component={Notes} />
        <Route path="/badges" component={Badges} />
        <Route path="/accounts" component={Accounts} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppContent />
            <AiChat />
            <PWALayer />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
