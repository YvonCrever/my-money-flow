import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./app-themes.css";
import { applyAppThemeToDocument, readStoredAppThemeId } from "./lib/appThemes";
import { applyAppMastheadMotionToDocument, readStoredAppMastheadMotionId } from "./lib/appMastheadMotion";
import { endDevTiming, startDevTiming } from "./lib/devTimings";

startDevTiming('app-bootstrap');
startDevTiming('first-visible-render');

try {
  applyAppThemeToDocument(readStoredAppThemeId());
} catch (error) {
  console.error("[app-bootstrap] theme initialization failed", error);
}

try {
  applyAppMastheadMotionToDocument(readStoredAppMastheadMotionId());
} catch (error) {
  console.error("[app-bootstrap] masthead motion initialization failed", error);
}

createRoot(document.getElementById("root")!).render(<App />);
endDevTiming('app-bootstrap');
