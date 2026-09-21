import type {
  APState,
  Course,
  Degree,
  IntroPath,
  ManualCompletions,
  Plan,
  Profile,
  RutgersGrade,
  SASCoreProgress,
  Term,
} from "./types";
import { courses, scienceSequences } from "./data";

export const courseById = new Map(courses.map((c) => [c.id, c]));

export function currentMainTerm(date = new Date()): { term: Term; year: number } {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 4) return { term: "Spring", year };
  return { term: "Fall", year };
}

function termValue(term: Term, year: number): number {
  return year * 2 + (term === "Fall" ? 1 : 0);
}

export function generateSemesters(
  gradTerm: Term,
  gradYear: number,
  date = new Date(),
): string[] {
  let { term, year } = currentMainTerm(date);
  const target = termValue(gradTerm, gradYear);
  if (termValue(term, year) > target) return [];

  const result: string[] = [];
  while (termValue(term, year) <= target && result.length < 16) {
    result.push(`${term} ${year}`);
    if (term === "Spring") term = "Fall";
    else {
      term = "Spring";
      year += 1;
    }
  }
  return result;
}

export function isSpring2027OrLater(term: Term, year: number) {
  return termValue(term, year) >= termValue("Spring", 2027);
}

export function detectIntroPath(
  profile: Pick<Profile, "startTerm" | "startYear">,
  manual: ManualCompletions,
  date = new Date(),
): IntroPath {
  if (manual.CS111 || manual.CS112) return "legacy";
  if (isSpring2027OrLater(profile.startTerm, profile.startYear)) return "new";
  const current = currentMainTerm(date);
  if (isSpring2027OrLater(current.term, current.year)) return "new";
  return "legacy";
}

export function apCredits(ap: APState, introPath: IntroPath): Set<string> {
  const ids = new Set<string>();

  if (ap.csa === "4") ids.add(introPath === "new" ? "CS120" : "CS110");
  if (ap.csa === "5") ids.add(introPath === "new" ? "CS121" : "CS111");
  if (ap.csp !== "none") ids.add("CS110");

  if (ap.calcAB !== "none") ids.add("MATH151");
  if (ap.calcBC !== "none") {
    ids.add("MATH151");
    ids.add("MATH152");
  }

  if (ap.chemistry === "4") {
    ids.add("CHEM161");
    ids.add("CHEM171");
  }
  if (ap.chemistry === "5") {
    ids.add("CHEM161");
    ids.add("CHEM162");
    ids.add("CHEM171");
  }

  return ids;
}

export function placementEquivalencies(ap: APState, introPath: IntroPath): Set<string> {
  const result = new Set<string>();
  if (introPath === "new" && ap.csPlacement === "CS121") result.add("CS120");
  return result;
}

const cOrBetter = new Set<RutgersGrade>(["A", "B+", "B", "C+", "C"]);

export function courseCountsForDegree(completion: ManualCompletions[string]) {
  if (!completion) return false;
  if (completion.source === "transfer") return true;
  return completion.grade !== "F";
}

export function courseMeetsPrerequisite(completion: ManualCompletions[string]) {
  if (!completion) return false;
  if (completion.source === "transfer") return true;
  return completion.grade !== "TR" && cOrBetter.has(completion.grade as RutgersGrade);
}

export function degreeCompleted(
  manual: ManualCompletions,
  ap: APState,
  introPath: IntroPath,
): Set<string> {
  const result = new Set<string>();
  Object.entries(manual).forEach(([id, completion]) => {
    if (courseCountsForDegree(completion)) result.add(id);
  });
  apCredits(ap, introPath).forEach((id) => result.add(id));
  return result;
}

export function prerequisiteCompleted(
  manual: ManualCompletions,
  ap: APState,
  introPath: IntroPath,
): Set<string> {
  const result = new Set<string>();
  Object.entries(manual).forEach(([id, completion]) => {
    if (courseMeetsPrerequisite(completion)) result.add(id);
  });
  apCredits(ap, introPath).forEach((id) => result.add(id));
  placementEquivalencies(ap, introPath).forEach((id) => result.add(id));
  return result;
}

export function sourceForCourse(
  id: string,
  manual: ManualCompletions,
  ap: APState,
  introPath: IntroPath,
): "ap" | "rutgers" | "transfer" | "placement" | null {
  if (apCredits(ap, introPath).has(id)) return "ap";
  if (placementEquivalencies(ap, introPath).has(id)) return "placement";
  return manual[id]?.source ?? null;
}

export type Requirement = { key: string; label: string; alternatives: string[] };

export function coreRequirements(introPath: IntroPath): Requirement[] {
  return [
    {
      key: "intro",
      label: introPath === "new" ? "Intro CS (CS121 / equivalent)" : "Intro CS (CS111 / equivalent)",
      alternatives: introPath === "new" ? ["CS121", "CS111"] : ["CS111", "CS121"],
    },
    {
      key: "data",
      label: introPath === "new" ? "Data Structures (CS122 / equivalent)" : "Data Structures (CS112 / equivalent)",
      alternatives: introPath === "new" ? ["CS122", "CS112"] : ["CS112", "CS122"],
    },
    { key: "205", label: "CS205 Discrete Structures I", alternatives: ["CS205"] },
    { key: "206", label: "CS206 Discrete Structures II", alternatives: ["CS206"] },
    { key: "211", label: "CS211 Computer Architecture", alternatives: ["CS211"] },
    { key: "344", label: "CS344 Algorithms", alternatives: ["CS344"] },
  ];
}

export const mathRequirements: Requirement[] = [
  { key: "151", label: "MATH151 Calculus I", alternatives: ["MATH151"] },
  { key: "152", label: "MATH152 Calculus II", alternatives: ["MATH152"] },
  { key: "250", label: "MATH250 Linear Algebra", alternatives: ["MATH250"] },
];

export function requirementSatisfied(req: Requirement, done: Set<string>) {
  return req.alternatives.some((id) => done.has(id));
}

export function countSatisfied(reqs: Requirement[], done: Set<string>) {
  return reqs.filter((r) => requirementSatisfied(r, done)).length;
}

export function electiveTargets(degree: Degree) {
  return degree === "BA"
    ? { total: 5, cs: 3, upperCs: 2, residency: 7 }
    : { total: 7, cs: 5, upperCs: 2, residency: 7 };
}

export function electiveStats(
  done: Set<string>,
  manual: ManualCompletions,
  ap: APState,
  introPath: IntroPath,
) {
  const rawCompletedElectives = courses.filter((c) => c.designatedElective && done.has(c.id));
  // Rutgers allows at most one 493/494 Independent Study course to count as a designated elective.
  const independentStudy = rawCompletedElectives.filter((c) => c.id === "CS493" || c.id === "CS494").slice(0, 1);
  const completedElectives = [
    ...rawCompletedElectives.filter((c) => c.id !== "CS493" && c.id !== "CS494"),
    ...independentStudy,
  ];
  const csElectives = completedElectives.filter((c) => c.csDept);
  const upperCs = csElectives.filter((c) => (c.level ?? 0) >= 300);
  const rutgersCsResidency = courses.filter((c) => {
    const isMajorCourse = c.group === "core" || c.designatedElective;
    return (
      isMajorCourse &&
      c.csDept &&
      done.has(c.id) &&
      sourceForCourse(c.id, manual, ap, introPath) === "rutgers"
    );
  });

  return {
    total: completedElectives.length,
    cs: csElectives.length,
    upperCs: upperCs.length,
    rutgersCsResidency: rutgersCsResidency.length,
  };
}

export function scienceStatus(done: Set<string>) {
  const detail = scienceSequences.map((sequence) => ({
    sequence,
    missing: sequence.filter((id) => !done.has(id)),
  }));
  const complete = detail.some((d) => d.missing.length === 0);
  const best = [...detail].sort((a, b) => a.missing.length - b.missing.length)[0];
  return { complete, bestSequence: best.sequence, missingFromBest: best.missing };
}

export function dGradeStatus(manual: ManualCompletions) {
  const majorIds = new Set(
    courses
      .filter((c) => c.group === "core" || c.group === "math" || c.group === "science" || c.designatedElective)
      .map((c) => c.id),
  );
  const dCourses = Object.entries(manual)
    .filter(([id, completion]) => majorIds.has(id) && completion.source === "rutgers" && completion.grade === "D")
    .map(([id]) => id);
  return { count: dCourses.length, courses: dCourses, withinLimit: dCourses.length <= 1 };
}

export function declarationStatus(
  prereqDone: Set<string>,
  manual: ManualCompletions,
  ap: APState,
  introPath: IntroPath,
) {
  const reqs: Requirement[] = [
    { key: "151", label: "MATH151 (or declaration-approved equivalent)", alternatives: ["MATH151"] },
    { key: "152", label: "MATH152", alternatives: ["MATH152"] },
    {
      key: "intro",
      label: introPath === "new" ? "CS121 / equivalent" : "CS111 / equivalent",
      alternatives: introPath === "new" ? ["CS121", "CS111"] : ["CS111", "CS121"],
    },
    {
      key: "data",
      label: introPath === "new" ? "CS122 / equivalent" : "CS112 / equivalent",
      alternatives: introPath === "new" ? ["CS122", "CS112"] : ["CS112", "CS122"],
    },
    { key: "205", label: "CS205 / declaration-approved equivalent", alternatives: ["CS205"] },
  ];

  const missing = reqs.filter((r) => !requirementSatisfied(r, prereqDone));
  const equivalentReqIds = [
    introPath === "new" ? ["CS121", "CS111"] : ["CS111", "CS121"],
    introPath === "new" ? ["CS122", "CS112"] : ["CS112", "CS122"],
    ["CS205"],
  ];

  const usedEquivalentCredit = equivalentReqIds.some((alts) =>
    alts.some((id) => {
      const source = sourceForCourse(id, manual, ap, introPath);
      return source === "ap" || source === "transfer";
    }),
  );

  const rutgersCsCOrBetter = courses.filter((c) => {
    if (!c.csDept || !(c.group === "core" || c.group === "cs-elective")) return false;
    const completion = manual[c.id];
    return completion?.source === "rutgers" && courseMeetsPrerequisite(completion);
  }).length;

  const residencyExceptionMet = !usedEquivalentCredit || rutgersCsCOrBetter >= 2;
  return {
    missing,
    usedEquivalentCredit,
    rutgersCsCOrBetter,
    residencyExceptionMet,
    eligible: missing.length === 0 && residencyExceptionMet,
  };
}

export function sasCoreSlots(progress: SASCoreProgress, ap: APState) {
  const collegeWriting = progress.collegeWriting || ap.english !== "none";
  const completed =
    Number(progress.ccd) +
    Number(progress.cco) +
    progress.nsCount +
    Number(progress.hst) +
    Number(progress.scl) +
    progress.ahCount +
    Number(collegeWriting) +
    Number(progress.wcr) +
    Number(progress.wcd) +
    Number(progress.qq) +
    Number(progress.qr);
  return { completed, total: 13, collegeWriting };
}

export function plannedIds(plan: Plan): Set<string> {
  return new Set(Object.values(plan).flat());
}

export function prerequisiteSatisfied(
  course: Course,
  completed: Set<string>,
  earlierPlanned: Set<string> = new Set(),
) {
  if (!course.prereqGroups || !course.prereqsVerified) return null;
  const have = new Set([...completed, ...earlierPlanned]);
  return course.prereqGroups.every((group) => group.some((id) => have.has(id)));
}

export function missingPrerequisites(
  course: Course,
  completed: Set<string>,
  earlierPlanned: Set<string> = new Set(),
) {
  if (!course.prereqGroups || !course.prereqsVerified) return [];
  const have = new Set([...completed, ...earlierPlanned]);
  return course.prereqGroups
    .filter((group) => !group.some((id) => have.has(id)))
    .map((group) => group.join(" or "));
}

export function previousPlannedForSemester(
  semester: string,
  semesters: string[],
  plan: Plan,
) {
  const index = semesters.indexOf(semester);
  return new Set(semesters.slice(0, Math.max(index, 0)).flatMap((s) => plan[s] ?? []));
}
