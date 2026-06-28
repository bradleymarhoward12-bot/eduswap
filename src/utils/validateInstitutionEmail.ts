import { UNIVERSITIES } from "@/config/universities";

function extractEmailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(atIndex + 1).trim();
}

export function validateInstitutionEmail(email: string, universityCode: string): boolean {
  const university = UNIVERSITIES[universityCode];
  if (!university) {
    return false;
  }

  const domain = extractEmailDomain(email);
  if (!domain) {
    return false;
  }

  return university.domains.some((allowedDomain) => allowedDomain.toLowerCase() === domain);
}
