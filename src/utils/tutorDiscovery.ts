import type { TutorCourse, TutorProfile } from "@/types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasValidCourses(tutor: TutorProfile): boolean {
  return tutor.courses.length > 0;
}

function courseTokens(course: TutorCourse): string[] {
  return `${course.code} ${course.title}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreCourse(course: TutorCourse, query: string): number | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }

  const code = course.code.toLowerCase();
  const title = course.title.toLowerCase();
  const tokens = normalizedQuery.split(" ");

  if (code === normalizedQuery) {
    return 0;
  }

  if (code.includes(normalizedQuery)) {
    return 1;
  }

  if (tokens.length > 1 && tokens.every((token) => title.includes(token))) {
    return 2;
  }

  if (title.includes(normalizedQuery)) {
    return 3;
  }

  if (tokens.some((token) => code.includes(token) || title.includes(token))) {
    return 4;
  }

  return null;
}

export function scoreTutorForQuery(tutor: TutorProfile, query: string): number | null {
  if (!query.trim()) {
    return 0;
  }

  const scores = tutor.courses
    .map((course) => scoreCourse(course, query))
    .filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return null;
  }

  return Math.min(...scores);
}

export function filterTutorsByCourseQuery(tutors: TutorProfile[], query: string): TutorProfile[] {
  const normalizedQuery = normalize(query);
  const scored = tutors
    .filter(hasValidCourses)
    .map((tutor) => ({
      tutor,
      score: scoreTutorForQuery(tutor, normalizedQuery),
    }))
    .filter((entry): entry is { tutor: TutorProfile; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || b.tutor.rating - a.tutor.rating || a.tutor.name.localeCompare(b.tutor.name));

  return scored.map((entry) => entry.tutor);
}

export function suggestCoursesFromTutors(
  tutors: TutorProfile[],
  query: string,
  limit = 4,
): TutorCourse[] {
  const normalizedQuery = normalize(query);
  const seen = new Set<string>();

  const ranked = tutors
    .flatMap((tutor) => tutor.courses)
    .map((course) => {
      const text = `${course.code} ${course.title}`.toLowerCase();
      const tokens = courseTokens(course);
      const overlap = normalizedQuery
        ? normalizedQuery
            .split(" ")
            .reduce((acc, token) => acc + Number(text.includes(token)), 0)
        : 0;
      const codeBoost = normalizedQuery && course.code.toLowerCase().includes(normalizedQuery) ? 2 : 0;
      const titleBoost = normalizedQuery && course.title.toLowerCase().includes(normalizedQuery) ? 1 : 0;
      const tokenOverlap = normalizedQuery
        ? normalizedQuery
            .split(" ")
            .reduce((acc, token) => acc + Number(tokens.includes(token)), 0)
        : 0;

      return {
        course,
        score: overlap + codeBoost + titleBoost + tokenOverlap,
      };
    })
    .filter(({ course }) => {
      const fingerprint = `${course.code}|${course.title}`;
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code) || a.course.title.localeCompare(b.course.title));

  return ranked.slice(0, limit).map((entry) => entry.course);
}
