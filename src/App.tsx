import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import DebugAnalyticsPanel from "./components/DebugAnalyticsPanel";
import Dashboard from "./pages/Dashboard/Dashboard";
import Landing from "./pages/Landing/Landing";

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");

  if (view === "landing") {
    return (
      <>
        <Landing onStart={() => setView("app")} />
        <Analytics />
        {import.meta.env.DEV && <DebugAnalyticsPanel />}
      </>
    );
  }

  return (
    <>
      <Dashboard />
      <Analytics />
      {import.meta.env.DEV && <DebugAnalyticsPanel />}
    </>
  );
}
