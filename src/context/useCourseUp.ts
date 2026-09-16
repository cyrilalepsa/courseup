import { useContext } from "react";
import { CourseUpContext } from "@/context/courseUpContext";
import type { CourseUpContextValue } from "@/context/courseUpContextValue";

export function useCourseUp(): CourseUpContextValue {
  const ctx = useContext(CourseUpContext);
  if (!ctx) {
    throw new Error("useCourseUp must be used within CourseUpProvider");
  }
  return ctx;
}

export type { CourseUpContextValue };
