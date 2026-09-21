export type Degree = "BA" | "BS";
export type Term = "Spring" | "Fall";
export type IntroPath = "legacy" | "new";
export type CreditSource = "rutgers" | "transfer";
export type RutgersGrade = "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
export type CourseGroup =
  | "core"
  | "math"
  | "cs-elective"
  | "related-elective"
  | "science"
  | "transition";

export type Track =
  | "None"
  | "Computer Security"
  | "Computer and Software Systems"
  | "Software Engineering & Information Management"
  | "Artificial Intelligence & Cognitive Science"
  | "Graphics & Vision"
  | "Computing Concepts & Themes";

export interface Course {
  id: string;
  code: string;
  short: string;
  title: string;
  credits?: number;
  group: CourseGroup;
  csDept: boolean;
  level?: number;
  designatedElective?: boolean;
  description?: string;
  prereqGroups?: string[][];
  prereqsVerified?: boolean;
  tracks?: Track[];
}

export interface Profile {
  degree: Degree;
  gradTerm: Term;
  gradYear: number;
  startTerm: Term;
  startYear: number;
  earnedCredits: number;
  gpa: number | null;
  honorsCollege: boolean;
  honorsCohort: "2025+" | "legacy";
  honorsJoin: "first-year" | "sophomore";
  track: Track;
}

export interface APState {
  csa: "none" | "4" | "5";
  csp: "none" | "4" | "5";
  calcAB: "none" | "4" | "5";
  calcBC: "none" | "4" | "5";
  chemistry: "none" | "4" | "5";
  english: "none" | "4" | "5";
  csPlacement: "not-taken" | "CS120" | "CS121";
}

export interface CourseCompletion {
  source: CreditSource;
  grade: RutgersGrade | "TR";
}

export type ManualCompletions = Record<string, CourseCompletion>;
export type Plan = Record<string, string[]>;

export interface SASCoreProgress {
  ccd: boolean;
  cco: boolean;
  nsCount: 0 | 1 | 2;
  hst: boolean;
  scl: boolean;
  ahCount: 0 | 1 | 2;
  collegeWriting: boolean;
  wcr: boolean;
  wcd: boolean;
  qq: boolean;
  qr: boolean;
  last42Residency: "unknown" | "met" | "not-met";
}

export interface HonorsProgress {
  mission: boolean;
  globalCompetence: boolean;
  serviceHours: number;
  distinctionCapstone: boolean;
}
