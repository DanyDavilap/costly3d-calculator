import { useState } from "react";
import Dashboard from "./pages/Dashboard/Dashboard";
import Landing from "./pages/Landing/Landing";

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");

  if (view === "landing") {
    return <Landing onStart={() => setView("app")} />;
  }

  return <Dashboard />;
}
