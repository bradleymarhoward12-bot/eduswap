export type PhilippineHEI = {
  code: string;
  name: string;
  domains: string[];
  campuses: string[];
};

export const UNIVERSITIES: Record<string, PhilippineHEI> = {
  NDKC: {
    code: "NDKC",
    name: "Notre Dame of Kidapawan College",
    domains: ["ndkc.edu.ph"],
    campuses: [
      "Main Campus - Admin Building",
      "NDKC Gymnasium",
      "IBED Campus",
    ],
  },
};
