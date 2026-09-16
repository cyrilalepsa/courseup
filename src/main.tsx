import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CourseUpProvider } from "./context/CourseUpContext";
import { initializeBridgeRegistry } from "./services/bridgeRegistryService";
import "./index.css";

initializeBridgeRegistry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CourseUpProvider>
      <App />
    </CourseUpProvider>
  </StrictMode>,
);
