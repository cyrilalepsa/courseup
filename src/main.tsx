import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CourseUpProvider } from "./context/CourseUpContext";
import { initializeBridgeRegistry } from "./services/bridgeRegistryService";
import { initializeDemoCockpitSimulator } from "./services/demoCockpitService";
import "./index.css";

initializeBridgeRegistry();
initializeDemoCockpitSimulator();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CourseUpProvider>
      <App />
    </CourseUpProvider>
  </StrictMode>,
);
