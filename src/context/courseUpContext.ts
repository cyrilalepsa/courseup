import { createContext } from "react";
import type { CourseUpContextValue } from "@/context/courseUpContextValue";

export const CourseUpContext = createContext<CourseUpContextValue | null>(null);
