import { Suspense, type ReactNode } from "react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppThemeProvider } from "@/components/AppThemeProvider";
import { AppMastheadMotionProvider } from "@/components/AppMastheadMotionProvider";
import AppLayout from "@/features/shell/components/AppLayout";
import { lazyRoute } from "@/lib/lazyRoute";
import NotFound from "./pages/NotFound";

const HomeRoute = lazyRoute(() => import("@/features/home/routes/HomeRoute"), "la page d'accueil");
const CalendarRoute = lazyRoute(() => import("@/features/calendar/routes/CalendarRoute"), "la page calendrier");
const HabitTrackerRoute = lazyRoute(() => import("@/features/habits/routes/HabitTrackerRoute"), "la page habit tracker");
const FinanceRoute = lazyRoute(() => import("@/features/finance/routes/FinanceRoute"), "la page finances");
const ReadingRoute = lazyRoute(() => import("@/features/reading/routes/ReadingRoute"), "la page lecture");
const JournalRoute = lazyRoute(() => import("@/features/journal/routes/JournalRoute"), "la page journal");

function AppRouteContentFallback() {
  return (
    <div className="page-workspace" data-testid="app-route-fallback">
      <div className="workspace-chip-row">
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-40 rounded-[1.6rem]" />
        <Skeleton className="h-40 rounded-[1.6rem]" />
        <Skeleton className="h-40 rounded-[1.6rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[22rem] rounded-[1.8rem]" />
        <Skeleton className="h-[22rem] rounded-[1.8rem]" />
      </div>
    </div>
  );
}

function AppRouteBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AppRouteContentFallback />}>{children}</Suspense>;
}

function AppShell() {
  return (
    <AppThemeProvider>
      <AppMastheadMotionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<AppRouteBoundary><HomeRoute /></AppRouteBoundary>} />
                <Route path="calendar" element={<AppRouteBoundary><CalendarRoute /></AppRouteBoundary>} />
                <Route path="habits" element={<AppRouteBoundary><HabitTrackerRoute /></AppRouteBoundary>} />
                <Route path="finance">
                  <Route path=":tab?" element={<AppRouteBoundary><FinanceRoute /></AppRouteBoundary>} />
                </Route>
                <Route path="reading" element={<AppRouteBoundary><ReadingRoute /></AppRouteBoundary>} />
                <Route path="journal" element={<AppRouteBoundary><JournalRoute /></AppRouteBoundary>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppMastheadMotionProvider>
    </AppThemeProvider>
  );
}

const App = () => {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
};

export default App;
