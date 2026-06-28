import type { TutorCourse } from "@/types";

function normalizeCourseCode(code: string): string {
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeCourseTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

export function normalizeTutorCourse(course: Partial<TutorCourse> | null | undefined): TutorCourse | null {
  if (!course) {
    return null;
  }

  const code = normalizeCourseCode(course.code ?? "");
  const title = normalizeCourseTitle(course.title ?? "");
  if (!code || !title) {
    return null;
  }

  const grade = course.grade?.trim();
  return grade ? { code, title, grade } : { code, title };
}

export function normalizeTutorCourses(input: unknown): TutorCourse[] {
  const rawCourses = Array.isArray(input) ? input : [];
  const normalized = rawCourses
    .map((entry): TutorCourse | null => {
      if (entry && typeof entry === "object") {
        return normalizeTutorCourse(entry as Partial<TutorCourse>);
      }

      return null;
    })
    .filter((course): course is TutorCourse => Boolean(course));

  const uniqueCourses: TutorCourse[] = [];
  const seen = new Set<string>();

  normalized.forEach((course) => {
    const fingerprint = `${course.code}|${course.title}|${course.grade ?? ""}`;
    if (seen.has(fingerprint)) {
      return;
    }

    seen.add(fingerprint);
    uniqueCourses.push(course);
  });

  return uniqueCourses;
}

export function formatTutorCourse(course: TutorCourse): string {
  return course.grade
    ? `${course.code} — ${course.title} (${course.grade})`
    : `${course.code} — ${course.title}`;
}
