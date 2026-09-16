import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CourseUpProvider } from "./context/CourseUpContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CourseUpProvider>
      <App />
    </CourseUpProvider>
  </StrictMode>,
);
