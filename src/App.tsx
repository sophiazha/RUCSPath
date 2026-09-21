import mascot from "./assets/rutgers.png";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  GraduationCap,
  Info,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { courses, trackOptions } from "./data";
import {
  apCredits,
  coreRequirements,
  countSatisfied,
  currentMainTerm,
  dGradeStatus,
  declarationStatus,
  degreeCompleted,
  detectIntroPath,
  electiveStats,
  electiveTargets,
  generateSemesters,
  mathRequirements,
  missingPrerequisites,
  plannedIds,
  prerequisiteCompleted,
  prerequisiteSatisfied,
  previousPlannedForSemester,
  requirementSatisfied,
  sasCoreSlots,
  scienceStatus,
} from "./planner";
import type {
  APState,
  CourseCompletion,
  HonorsProgress,
  ManualCompletions,
  Plan,
  Profile,
  RutgersGrade,
  SASCoreProgress,
} from "./types";

const STORAGE = "ru-RUCSPath-v3";
const current = currentMainTerm(new Date());
const grades: RutgersGrade[] = ["A", "B+", "B", "C+", "C", "D", "F"];

const defaultProfile: Profile = {
  degree: "BS",
  gradTerm: "Spring",
  gradYear: current.year + 2,
  startTerm: "Fall",
  startYear: current.year,
  earnedCredits: 0,
  gpa: null,
  honorsCollege: false,
  honorsCohort: "2025+",
  honorsJoin: "first-year",
  track: "None",
};

const defaultAP: APState = {
  csa: "none",
  csp: "none",
  calcAB: "none",
  calcBC: "none",
  chemistry: "none",
  english: "none",
  csPlacement: "not-taken",
};

const defaultCore: SASCoreProgress = {
  ccd: false,
  cco: false,
  nsCount: 0,
  hst: false,
  scl: false,
  ahCount: 0,
  collegeWriting: false,
  wcr: false,
  wcd: false,
  qq: false,
  qr: false,
  last42Residency: "unknown",
};

const defaultHonors: HonorsProgress = {
  mission: false,
  globalCompetence: false,
  serviceHours: 0,
  distinctionCapstone: false,
};

type SavedState = {
  setupComplete: boolean;
  profile: Profile;
  ap: APState;
  manual: ManualCompletions;
  plan: Plan;
  sasCore: SASCoreProgress;
  honors: HonorsProgress;
};

function normalizeManual(raw: unknown): ManualCompletions {
  if (!raw || typeof raw !== "object") return {};
  const result: ManualCompletions = {};
  Object.entries(raw as Record<string, unknown>).forEach(([id, value]) => {
    if (value === "rutgers") result[id] = { source: "rutgers", grade: "A" };
    else if (value === "transfer") result[id] = { source: "transfer", grade: "TR" };
    else if (value && typeof value === "object" && "source" in value) {
      const v = value as CourseCompletion;
      result[id] = v.source === "transfer"
        ? { source: "transfer", grade: "TR" }
        : { source: "rutgers", grade: grades.includes(v.grade as RutgersGrade) ? v.grade : "A" };
    }
  });
  return result;
}

function loadSaved(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE) ?? localStorage.getItem("ru-RUCSPath-v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        setupComplete: Boolean(parsed.setupComplete),
        profile: { ...defaultProfile, ...(parsed.profile ?? {}) },
        ap: { ...defaultAP, ...(parsed.ap ?? {}) },
        manual: normalizeManual(parsed.manual),
        plan: parsed.plan ?? {},
        sasCore: { ...defaultCore, ...(parsed.sasCore ?? {}) },
        honors: { ...defaultHonors, ...(parsed.honors ?? {}) },
      };
    }
  } catch {
    // Ignore invalid older local state.
  }
  return {
    setupComplete: false,
    profile: defaultProfile,
    ap: defaultAP,
    manual: {},
    plan: {},
    sasCore: defaultCore,
    honors: defaultHonors,
  };
}

function App() {
  const initial = useMemo(loadSaved, []);
  const [setupComplete, setSetupComplete] = useState(initial.setupComplete);
  const [profile, setProfile] = useState(initial.profile);
  const [ap, setAP] = useState(initial.ap);
  const [manual, setManual] = useState<ManualCompletions>(initial.manual);
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [sasCore, setSasCore] = useState<SASCoreProgress>(initial.sasCore);
  const [honors, setHonors] = useState(initial.honors);

  function persist(patch: Partial<SavedState> = {}) {
    localStorage.setItem(
      STORAGE,
      JSON.stringify({ setupComplete, profile, ap, manual, plan, sasCore, honors, ...patch }),
    );
  }

  if (!setupComplete) {
    return (
      <Onboarding
        profile={profile}
        setProfile={setProfile}
        ap={ap}
        setAP={setAP}
        manual={manual}
        setManual={setManual}
        sasCore={sasCore}
        setSasCore={setSasCore}
        onFinish={() => {
          setSetupComplete(true);
          persist({ setupComplete: true });
        }}
      />
    );
  }

  return (
    <Dashboard
      profile={profile}
      ap={ap}
      manual={manual}
      plan={plan}
      sasCore={sasCore}
      honors={honors}
      setPlan={(next) => {
        setPlan(next);
        persist({ plan: next });
      }}
      setSasCore={(next) => {
        setSasCore(next);
        persist({ sasCore: next });
      }}
      setHonors={(next) => {
        setHonors(next);
        persist({ honors: next });
      }}
      onEditProfile={() => {
        setSetupComplete(false);
        persist({ setupComplete: false });
      }}
    />
  );
}

function Onboarding({
  profile,
  setProfile,
  ap,
  setAP,
  manual,
  setManual,
  sasCore,
  setSasCore,
  onFinish,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  ap: APState;
  setAP: (a: APState) => void;
  manual: ManualCompletions;
  setManual: (m: ManualCompletions) => void;
  sasCore: SASCoreProgress;
  setSasCore: (s: SASCoreProgress) => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(1);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseTab, setCourseTab] = useState<"core" | "electives" | "science">("core");

  const introPath = detectIntroPath(profile, manual);
  const apSet = apCredits(ap, introPath);
  const doneForDegree = degreeCompleted(manual, ap, introPath);
  const startYears = Array.from({ length: 8 }, (_, i) => current.year - 5 + i);
  const gradYears = Array.from({ length: 8 }, (_, i) => current.year + i);

  const visibleCourses = courses.filter((course) => {
    const q = courseSearch.trim().toLowerCase();
    if (q && !`${course.short} ${course.code} ${course.title}`.toLowerCase().includes(q)) return false;
    if (courseTab === "core") return ["core", "math", "transition"].includes(course.group);
    if (courseTab === "electives") return course.group === "cs-elective" || course.group === "related-elective";
    return course.group === "science";
  });

  function toggleManual(id: string) {
    if (apSet.has(id)) return;
    const next = { ...manual };
    if (next[id]) delete next[id];
    else next[id] = { source: "rutgers", grade: "A" };
    setManual(next);
  }

  function updateCompletion(id: string, patch: Partial<CourseCompletion>) {
    const currentCompletion = manual[id] ?? { source: "rutgers" as const, grade: "A" as const };
    const source = patch.source ?? currentCompletion.source;
    const nextCompletion: CourseCompletion = source === "transfer"
      ? { source: "transfer", grade: "TR" }
      : {
        source: "rutgers",
        grade: (patch.grade && patch.grade !== "TR" ? patch.grade : currentCompletion.grade === "TR" ? "A" : currentCompletion.grade),
      };
    setManual({ ...manual, [id]: nextCompletion });
  }

  return (
    <main className="onboardingPage">
      <header className="onboardingHeader">
        <Brand />
        <div className="stepLabel">Setup {step} of 5</div>
      </header>

      <div className="stepTrack">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`stepFill ${n <= step ? "active" : ""}`} />
        ))}
      </div>

      <section className="onboardingCard">
        {step === 1 && (
          <>
            <span className="eyebrow">YOUR RUTGERS PROFILE</span>
            <h1>Plan your Rutgers CS Degree</h1>
            <p className="lead">
              Tell us where you are in your Rutgers journey. RUCSPath will use your course history and graduation goal to help you build a personalized degree plan!
            </p>

            <div className="formGrid">
              <Field label="Computer Science degree">
                <div className="segmented">
                  {(["BA", "BS"] as const).map((degree) => (
                    <button
                      type="button"
                      key={degree}
                      className={profile.degree === degree ? "selected" : ""}
                      onClick={() => setProfile({ ...profile, degree })}
                    >
                      {degree === "BA" ? "B.A." : "B.S."}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="First Rutgers–New Brunswick semester">
                <div className="inlineInputs">
                  <select
                    value={profile.startTerm}
                    onChange={(e) => setProfile({ ...profile, startTerm: e.target.value as Profile["startTerm"] })}
                  >
                    <option>Fall</option>
                    <option>Spring</option>
                  </select>
                  <select
                    value={profile.startYear}
                    onChange={(e) => setProfile({ ...profile, startYear: Number(e.target.value) })}
                  >
                    {startYears.map((year) => <option key={year}>{year}</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Expected graduation">
                <div className="inlineInputs">
                  <select
                    value={profile.gradTerm}
                    onChange={(e) => setProfile({ ...profile, gradTerm: e.target.value as Profile["gradTerm"] })}
                  >
                    <option>Spring</option>
                    <option>Fall</option>
                  </select>
                  <select
                    value={profile.gradYear}
                    onChange={(e) => setProfile({ ...profile, gradYear: Number(e.target.value) })}
                  >
                    {gradYears.map((year) => <option key={year}>{year}</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Degree credits already earned">
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={profile.earnedCredits}
                  onChange={(e) => setProfile({ ...profile, earnedCredits: Math.max(0, Number(e.target.value) || 0) })}
                />
                <small>Use the total degree credits shown on your Rutgers record, including accepted AP/transfer credit.</small>
              </Field>

              <Field label="Current cumulative GPA (optional)">
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={0.01}
                  placeholder="e.g. 3.65"
                  value={profile.gpa ?? ""}
                  onChange={(e) => setProfile({ ...profile, gpa: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>

              <Field label="Optional CS interest track">
                <select
                  value={profile.track}
                  onChange={(e) => setProfile({ ...profile, track: e.target.value as Profile["track"] })}
                >
                  {trackOptions.map((track) => <option key={track}>{track}</option>)}
                </select>
              </Field>
            </div>

            <div className="pathNotice">
              <Sparkles size={17} />
              <div>
                <strong>Likely intro pathway: {introPath === "new" ? "CS120 → CS121 → CS122" : "CS111 → CS112"}</strong>
                <span>
                  RUCSPath estimates this from your entry date and updates it using the
                  CS coursework you enter later.
                </span>
              </div>
            </div>

            <label className="checkCard">
              <input
                type="checkbox"
                checked={profile.honorsCollege}
                onChange={(e) => setProfile({ ...profile, honorsCollege: e.target.checked })}
              />
              <div>
                <strong>I am in the Rutgers Honors College</strong>
                <span>Add a separate Honors College progress panel. It does not change the CS major requirements.</span>
              </div>
            </label>

            {profile.honorsCollege && (
              <div className="formGrid honorsSetup">
                <Field label="Honors curriculum">
                  <select
                    value={profile.honorsCohort}
                    onChange={(e) => setProfile({ ...profile, honorsCohort: e.target.value as Profile["honorsCohort"] })}
                  >
                    <option value="2025+">Entered Honors College Fall 2025 or later</option>
                    <option value="legacy">Entered before Fall 2025</option>
                  </select>
                </Field>
                {profile.honorsCohort === "2025+" && (
                  <Field label="Joined Honors College as">
                    <select
                      value={profile.honorsJoin}
                      onChange={(e) => setProfile({ ...profile, honorsJoin: e.target.value as Profile["honorsJoin"] })}
                    >
                      <option value="first-year">Incoming first-year</option>
                      <option value="sophomore">Sophomore</option>
                    </select>
                  </Field>
                )}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <span className="eyebrow">AP & PLACEMENT</span>
            <h1>What did you place out of?</h1>
            <p className="lead">
              Qualifying AP scores may grant Rutgers credit or course equivalency.
              {introPath === "new"
                ? " For the new CS intro sequence, students without an AP CSA score of 4 or 5 must take the CS placement exam, which determines whether they begin in CS120 or CS121."
                : " Your current pathway uses the CS111/CS112 sequence, so the legacy AP credit rules are shown below."}
            </p>

            <div className="apGrid">
              <APSelect
                title="AP Computer Science A"
                value={ap.csa}
                onChange={(value) => setAP({ ...ap, csa: value })}
                note={introPath === "new" ? "New sequence: 4 → CS120 equivalency; 5 → CS121 credit/equivalency." : "Legacy SAS path: 4 → CS110; 5 → CS111."}
              />
              <APSelect
                title="AP Computer Science Principles"
                value={ap.csp}
                onChange={(value) => setAP({ ...ap, csp: value })}
                note="4 or 5 → CS110 equivalency. CS110 is not a CS-major core course."
              />
              <APSelect
                title="AP Calculus AB"
                value={ap.calcAB}
                onChange={(value) => setAP({ ...ap, calcAB: value })}
                note="4 or 5 → MATH151."
              />
              <APSelect
                title="AP Calculus BC"
                value={ap.calcBC}
                onChange={(value) => setAP({ ...ap, calcBC: value })}
                note="4 or 5 → MATH151 and MATH152."
              />
              <APSelect
                title="AP Chemistry"
                value={ap.chemistry}
                onChange={(value) => setAP({ ...ap, chemistry: value })}
                note="SAS: 4 → CHEM161 + CHEM171; 5 → CHEM161 + CHEM162 + CHEM171."
              />
              <APSelect
                title="AP English Language or Literature"
                value={ap.english}
                onChange={(value) => setAP({ ...ap, english: value })}
                note="A 4 or 5 exempts SAS students from College Writing; WCr and WCd are still required."
              />
            </div>

            {introPath === "new" && ap.csa === "none" && (
              <Field label="CS placement exam result">
                <select
                  value={ap.csPlacement}
                  onChange={(e) => setAP({ ...ap, csPlacement: e.target.value as APState["csPlacement"] })}
                >
                  <option value="not-taken">Not taken / result unknown</option>
                  <option value="CS120">Eligible to begin in CS120</option>
                  <option value="CS121">Eligible to begin in CS121 (CS120 equivalency)</option>
                </select>
                <small>The official CS placement exam determines CS120 vs. CS121 eligibility for students without qualifying AP CSA.</small>
              </Field>
            )}

            <div className="creditPreview">
              <strong>Automatically recognized by RUCSPath</strong>
              <div className="chipRow">
                {[...apSet].length ? [...apSet].map((id) => <span className="chip" key={id}>{id}</span>) : <span className="muted">No course-equivalent AP credit selected.</span>}
              </div>
            </div>
            <p className="apFootnote">
              AP credit is awarded after Rutgers receives and evaluates your official
              College Board score report.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <span className="eyebrow">PAST COURSEWORK & GRADES</span>
            <h1>Select everything you already completed.</h1>
            <p className="lead">
              Grades matter: Rutgers allows no more than one D in courses applied to the CS major, and a D cannot satisfy a prerequisite. Transfer/equivalent courses are treated as approved credit rather than given a Rutgers letter grade.
            </p>

            <div className="courseToolbar">
              <div className="tabBar">
                <button type="button" className={courseTab === "core" ? "selected" : ""} onClick={() => setCourseTab("core")}>Core & Math</button>
                <button type="button" className={courseTab === "electives" ? "selected" : ""} onClick={() => setCourseTab("electives")}>Electives</button>
                <button type="button" className={courseTab === "science" ? "selected" : ""} onClick={() => setCourseTab("science")}>B.S. Science</button>
              </div>
              <label className="searchBox">
                <Search size={16} />
                <input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} placeholder="Search course number or title..." />
              </label>
            </div>

            <div className="completionList">
              {visibleCourses.map((course) => {
                const isAP = apSet.has(course.id);
                const completion = manual[course.id];
                const checked = isAP || Boolean(completion);
                return (
                  <div className={`completionRow ${checked ? "checked" : ""}`} key={course.id}>
                    <label className="courseCheckLabel">
                      <input type="checkbox" checked={checked} disabled={isAP} onChange={() => toggleManual(course.id)} />
                      <div className="courseIdentity">
                        <strong>{course.short}</strong>
                        <span>{course.title}</span>
                        <small>{course.code}</small>
                      </div>
                    </label>

                    {isAP ? (
                      <span className="sourceBadge ap">AP / equivalency</span>
                    ) : completion ? (
                      <div className="completionControls">
                        <select
                          className="sourceSelect"
                          value={completion.source}
                          onChange={(e) => updateCompletion(course.id, { source: e.target.value as CourseCompletion["source"] })}
                        >
                          <option value="rutgers">Rutgers–NB</option>
                          <option value="transfer">Transfer / equivalent</option>
                        </select>
                        {completion.source === "rutgers" ? (
                          <select
                            className={`gradeSelect ${completion.grade === "D" || completion.grade === "F" ? "gradeWarning" : ""}`}
                            value={completion.grade}
                            onChange={(e) => updateCompletion(course.id, { grade: e.target.value as RutgersGrade })}
                          >
                            {grades.map((grade) => <option key={grade}>{grade}</option>)}
                          </select>
                        ) : (
                          <span className="sourceBadge transfer">Approved transfer</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="selectedSummary">
              <strong>{doneForDegree.size} completed/equivalent courses selected</strong>
              <span>Courses with F are stored in your history but do not count as completed. D can count toward a major requirement only within Rutgers' one-D limit and never satisfies a prerequisite.</span>
            </div>
          </>
        )}

        {step === 4 && (
          <SASCoreSetup sasCore={sasCore} setSasCore={setSasCore} ap={ap} />
        )}

        {step === 5 && (
          <Review profile={profile} ap={ap} manual={manual} sasCore={sasCore} />
        )}

        <div className="wizardActions">
          <button type="button" className="backButton" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            <ChevronLeft size={17} /> Back
          </button>
          {step < 5 ? (
            <button type="button" className="continueButton" onClick={() => setStep(step + 1)}>
              Continue <ChevronRight size={17} />
            </button>
          ) : (
            <button type="button" className="continueButton" onClick={onFinish}>
              Build my Rutgers plan <Sparkles size={17} />
            </button>
          )}
        </div>
      </section>

      <p className="disclaimer">
        Student-built planning aid. Always verify final requirements in Degree Navigator, the Schedule of Classes, and with Rutgers advising.
      </p>
    </main>
  );
}

function SASCoreSetup({
  sasCore,
  setSasCore,
  ap,
}: {
  sasCore: SASCoreProgress;
  setSasCore: (s: SASCoreProgress) => void;
  ap: APState;
}) {
  const englishAP = ap.english !== "none";
  return (
    <>
      <span className="eyebrow">SAS DEGREE REQUIREMENTS</span>
      <h1>What have you completed in the SAS Core?</h1>
      <p className="lead">
        Open your Rutgers Degree Navigator and look at your SAS Core Curriculum audit.
        Mark a requirement below only if Degree Navigator shows it as satisfied.
      </p>
      <div className="degreeNavHelp">
  <Info size={18} />
  <div>
    <strong>Check Degree Navigator before filling this out</strong>
    <span>
      Find your SAS Core Curriculum section and copy the requirements that are
      already marked complete. If you are unsure about something, leave it
      unchecked.
    </span>
  </div>
</div>

      <div className="coreSetupGrid">
        <CoreSetupCard title="Contemporary Challenges" note="Both CCD and CCO are required. AP/transfer credit cannot satisfy these goals.">
          <CoreToggle label="CCD" checked={sasCore.ccd} onChange={(ccd) => setSasCore({ ...sasCore, ccd })} />
          <CoreToggle label="CCO" checked={sasCore.cco} onChange={(cco) => setSasCore({ ...sasCore, cco })} />
        </CoreSetupCard>

        <CoreSetupCard title="Natural Sciences" note="Two degree-credit-bearing NS courses are required.">
          <CountSelect label="NS courses completed" value={sasCore.nsCount} max={2} onChange={(value) => setSasCore({ ...sasCore, nsCount: value as 0 | 1 | 2 })} />
        </CoreSetupCard>

        <CoreSetupCard title="Social & Historical Analysis" note="HST and SCL must be completed with two different courses.">
          <CoreToggle label="HST" checked={sasCore.hst} onChange={(hst) => setSasCore({ ...sasCore, hst })} />
          <CoreToggle label="SCL" checked={sasCore.scl} onChange={(scl) => setSasCore({ ...sasCore, scl })} />
        </CoreSetupCard>

        <CoreSetupCard title="Arts & Humanities" note="Two different courses meeting two distinct AH goals are required.">
          <CountSelect label="Distinct AH requirements completed" value={sasCore.ahCount} max={2} onChange={(value) => setSasCore({ ...sasCore, ahCount: value as 0 | 1 | 2 })} />
        </CoreSetupCard>

        <CoreSetupCard title="Writing & Communication" note="College Writing + WCr + WCd. WCr and WCd must be different courses.">
          <CoreToggle label="College Writing / equivalent" checked={sasCore.collegeWriting || englishAP} disabled={englishAP} onChange={(collegeWriting) => setSasCore({ ...sasCore, collegeWriting })} />
          <CoreToggle label="WCr" checked={sasCore.wcr} onChange={(wcr) => setSasCore({ ...sasCore, wcr })} />
          <CoreToggle label="WCd" checked={sasCore.wcd} onChange={(wcd) => setSasCore({ ...sasCore, wcd })} />
          {englishAP && <small className="autoNote">College Writing is marked complete from AP English 4/5.</small>}
        </CoreSetupCard>

        <CoreSetupCard title="Quantitative & Formal Reasoning" note="QQ and QR require two different courses, even if one course carries both codes.">
          <CoreToggle label="QQ" checked={sasCore.qq} onChange={(qq) => setSasCore({ ...sasCore, qq })} />
          <CoreToggle label="QR" checked={sasCore.qr} onChange={(qr) => setSasCore({ ...sasCore, qr })} />
        </CoreSetupCard>
      </div>

      <Field label="30 of your last 42 credits at Rutgers–New Brunswick">
        <select
          value={sasCore.last42Residency}
          onChange={(e) => setSasCore({ ...sasCore, last42Residency: e.target.value as SASCoreProgress["last42Residency"] })}
        >
          <option value="unknown">Not sure / too early to evaluate</option>
          <option value="met">Requirement met</option>
          <option value="not-met">Not currently met</option>
        </select>
        <small>This requirement usually matters closer to graduation. If you are not sure,
  leave this as “Not sure / too early to evaluate.”</small>
      </Field>
    </>
  );
}

function Review({
  profile,
  ap,
  manual,
  sasCore,
}: {
  profile: Profile;
  ap: APState;
  manual: ManualCompletions;
  sasCore: SASCoreProgress;
}) {
  const introPath = detectIntroPath(profile, manual);
  const degreeDone = degreeCompleted(manual, ap, introPath);
  const core = countSatisfied(coreRequirements(introPath), degreeDone);
  const math = countSatisfied(mathRequirements, degreeDone);
  const electives = electiveStats(degreeDone, manual, ap, introPath);
  const target = electiveTargets(profile.degree);
  const semesters = generateSemesters(profile.gradTerm, profile.gradYear);
  const coreSlots = sasCoreSlots(sasCore, ap);
  const dStatus = dGradeStatus(manual);

  return (
    <>
      <span className="eyebrow">REVIEW</span>
      <h1>Review your plan</h1>
      <p className="lead">
        Review your degree choice, completed requirements, and graduation timeline before RUCSPath builds your semester plan.
      </p>
      <div className="reviewGrid">
        <ReviewItem label="Degree" value={`Computer Science ${profile.degree === "BA" ? "B.A." : "B.S."}`} />
        <ReviewItem label="Target graduation" value={`${profile.gradTerm} ${profile.gradYear}`} />
        <ReviewItem label="CS Intro pathway" value={introPath === "new" ? "120 / 121 / 122" : "111 / 112"} />
        <ReviewItem label="Semesters remaining" value={`${semesters.length}`} />
        <ReviewItem label="CS core" value={`${core}/6`} />
        <ReviewItem label="Math" value={`${math}/3`} />
        <ReviewItem label="Designated electives" value={`${electives.total}/${target.total}`} />
        <ReviewItem label="SAS Core" value={`${coreSlots.completed}/${coreSlots.total}`} />
      </div>
      {!dStatus.withinLimit && (
        <div className="reviewWarning">
          <AlertCircle size={17} /> You entered {dStatus.count} D grades in courses that can apply to the major. Rutgers permits no more than one D in courses applied toward the CS major.
        </div>
      )}
    </>
  );
}

function Dashboard({
  profile,
  ap,
  manual,
  plan,
  sasCore,
  honors,
  setPlan,
  setSasCore,
  setHonors,
  onEditProfile,
}: {
  profile: Profile;
  ap: APState;
  manual: ManualCompletions;
  plan: Plan;
  sasCore: SASCoreProgress;
  honors: HonorsProgress;
  setPlan: (p: Plan) => void;
  setSasCore: (s: SASCoreProgress) => void;
  setHonors: (h: HonorsProgress) => void;
  onEditProfile: () => void;
}) {
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "required" | "electives" | "science">("all");

  const introPath = detectIntroPath(profile, manual);
  const degreeDone = degreeCompleted(manual, ap, introPath);
  const prereqDone = prerequisiteCompleted(manual, ap, introPath);
  const semesters = generateSemesters(profile.gradTerm, profile.gradYear);
  const normalizedPlan: Plan = Object.fromEntries(semesters.map((semester) => [semester, plan[semester] ?? []]));
  const active = activeSemester && semesters.includes(activeSemester) ? activeSemester : semesters[0] ?? null;

  const coreReqs = coreRequirements(introPath);
  const coreDone = countSatisfied(coreReqs, degreeDone);
  const mathDone = countSatisfied(mathRequirements, degreeDone);
  const stats = electiveStats(degreeDone, manual, ap, introPath);
  const targets = electiveTargets(profile.degree);
  const science = scienceStatus(degreeDone);
  const declaration = declarationStatus(prereqDone, manual, ap, introPath);
  const dStatus = dGradeStatus(manual);
  const coreSlots = sasCoreSlots(sasCore, ap);
  const planned = plannedIds(normalizedPlan);

  const majorComplete =
    coreDone === 6 &&
    mathDone === 3 &&
    stats.total >= targets.total &&
    stats.cs >= targets.cs &&
    stats.upperCs >= targets.upperCs &&
    stats.rutgersCsResidency >= targets.residency &&
    dStatus.withinLimit &&
    (profile.degree === "BA" || science.complete);

  const missingCoreCount = 6 - coreDone;
  const missingMathCount = 3 - mathDone;
  const missingElectives = Math.max(0, targets.total - stats.total);
  const scienceRemaining = profile.degree === "BS" && !science.complete ? science.missingFromBest.length : 0;
  const estimatedMajorCoursesRemaining = missingCoreCount + missingMathCount + missingElectives + scienceRemaining;
  const pace = semesters.length ? Math.ceil(estimatedMajorCoursesRemaining / semesters.length) : estimatedMajorCoursesRemaining;
  const creditsRemaining = Math.max(0, 120 - profile.earnedCredits);
  const creditsPerSemester = semesters.length ? Math.ceil((creditsRemaining / semesters.length) * 10) / 10 : creditsRemaining;

  const majorProgressParts = [
    coreDone / 6,
    mathDone / 3,
    Math.min(1, stats.total / targets.total),
    Math.min(1, stats.cs / targets.cs),
    Math.min(1, stats.upperCs / targets.upperCs),
    Math.min(1, stats.rutgersCsResidency / targets.residency),
    dStatus.withinLimit ? 1 : 0,
  ];
  if (profile.degree === "BS") majorProgressParts.push(science.complete ? 1 : 0);
  const majorProgress = Math.round(majorProgressParts.reduce((a, b) => a + b, 0) / majorProgressParts.length * 100);

  const recommendations = courses
    .filter((course) => !degreeDone.has(course.id) && !planned.has(course.id))
    .filter((course) => prerequisiteSatisfied(course, prereqDone) === true)
    .filter((course) => {
      if (course.id === "CS110") return false;

      if (
        introPath === "legacy" &&
        ["CS120", "CS121", "CS122"].includes(course.id)
      ) {
        return false;
      }

      if (
        introPath === "new" &&
        ["CS111", "CS112"].includes(course.id)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aRequired = ["core", "math"].includes(a.group) ? 1 : 0;
      const bRequired = ["core", "math"].includes(b.group) ? 1 : 0;
      const aTrack = profile.track !== "None" && a.tracks?.includes(profile.track) ? 1 : 0;
      const bTrack = profile.track !== "None" && b.tracks?.includes(profile.track) ? 1 : 0;
      return bRequired - aRequired || bTrack - aTrack || a.short.localeCompare(b.short);
    })
    .slice(0, 5);

  const catalog = courses
    .filter((course) => !degreeDone.has(course.id))
    .filter((course) => {
      // Don't show CS110 as a major-planning course.
      if (course.id === "CS110") return false;

      // Legacy pathway: use CS111 → CS112.
      if (
        introPath === "legacy" &&
        ["CS120", "CS121", "CS122"].includes(course.id)
      ) {
        return false;
      }

      // New pathway: use CS120 → CS121 → CS122.
      if (
        introPath === "new" &&
        ["CS111", "CS112"].includes(course.id)
      ) {
        return false;
      }

      return true;
    })
    .filter((course) => {
      const q = catalogSearch.toLowerCase().trim();
      return !q || `${course.short} ${course.code} ${course.title}`.toLowerCase().includes(q);
    })
    .filter((course) => {
      if (catalogFilter === "required") return ["core", "math"].includes(course.group);
      if (catalogFilter === "electives") return Boolean(course.designatedElective);
      if (catalogFilter === "science") return course.group === "science";
      return course.group !== "transition" || introPath === "new";
    });

  function addToSemester(courseId: string, semester = active) {
    if (!semester || planned.has(courseId) || degreeDone.has(courseId)) {
      return;
    }

    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      return;
    }

    const earlierPlanned = previousPlannedForSemester(
      semester,
      semesters,
      normalizedPlan
    );

    const eligible = prerequisiteSatisfied(
      course,
      prereqDone,
      earlierPlanned
    );

    // Don't allow a course if its verified prerequisites are missing.
    if (eligible === false) {
      return;
    }

    setPlan({
      ...normalizedPlan,
      [semester]: [
        ...(normalizedPlan[semester] ?? []),
        courseId
      ]
    });
  }
  function removeFromSemester(semester: string, id: string) {
    setPlan({ ...normalizedPlan, [semester]: (normalizedPlan[semester] ?? []).filter((courseId) => courseId !== id) });
  }

  return (
    <main className="dashboardPage">
      <header className="dashHeader">
        <Brand />
        <div className="headerActions">
          <div className="profilePill">
            <strong>CS {profile.degree === "BA" ? "B.A." : "B.S."}</strong>
            <span>{profile.gradTerm} {profile.gradYear}</span>
          </div>
          <button type="button" className="editButton" onClick={onEditProfile}>
            <Pencil size={15} /> Edit profile & coursework
          </button>
        </div>
      </header>

      <section className="dashHero">
        <div>
          <span className="eyebrow">RUTGERS–NEW BRUNSWICK · COMPUTER SCIENCE</span>
          <h1>Your Rutgers CS Plan!</h1>
          <p>
            Current term: <strong>{current.term} {current.year}</strong> · Target: <strong>{profile.gradTerm} {profile.gradYear}</strong> · <strong>{semesters.length} semester{semesters.length === 1 ? "" : "s"} remaining</strong>
          </p>
          <div className="pathInline">Intro path: <strong>{introPath === "new" ? "CS120 / CS121 / CS122" : "CS111 / CS112"}</strong> · chosen automatically from your timeline and coursework</div>
        </div>
        <div className="majorProgress">
          <span>Major requirement progress</span>
          <strong>{majorProgress}%</strong>
          <div className="progressTrack"><div style={{ width: `${majorProgress}%` }} /></div>
          <small>{majorComplete ? "Major requirements appear complete" : "Use Degree Navigator for the official audit"}</small>
        </div>
      </section>

      <section className="metricGrid">
        <Metric label="CS Core" value={`${coreDone}/6`} sub={`${6 - coreDone} remaining`} icon={<BookOpen size={18} />} />
        <Metric label="Math" value={`${mathDone}/3`} sub={`${3 - mathDone} remaining`} icon={<ShieldCheck size={18} />} />
        <Metric label="Designated electives" value={`${stats.total}/${targets.total}`} sub={`${stats.cs}/${targets.cs} must be Rutgers Computer Science`} icon={<Sparkles size={18} />} />
        <Metric label="SAS Core slots" value={`${coreSlots.completed}/${coreSlots.total}`} sub="Confirm in Degree Navigator" icon={<GraduationCap size={18} />} />
<Metric
  label="Reported credits"
  value={`${profile.earnedCredits}/120`}
  sub="Based on the total entered in your profile"
  icon={<CalendarDays size={18} />}
/>      </section>

      <section className="dashboardGrid">
        <div className="mainColumn">
          <OverallDegreePanel
            profile={profile}
            coreSlots={coreSlots}
            majorComplete={majorComplete}
            sasCore={sasCore}
          />

          <section className="panel">
            <div className="panelHeader">
              <div><span className="eyebrow">GRADUATION PACE</span><h2>Are you on pace?</h2></div>
              <CalendarDays size={20} />
            </div>
            <div className="paceGrid">
              <PaceStat label="Estimated major courses left" value={estimatedMajorCoursesRemaining} />
              <PaceStat label="Suggested major courses / semester" value={pace} />
              <PaceStat label="Credits to 120" value={creditsRemaining} />
              <PaceStat label="Average credits / semester" value={creditsPerSemester} />
            </div>
            <div className={`paceMessage ${pace >= 4 || creditsPerSemester > 18 ? "warning" : ""}`}>
              {semesters.length === 0 ? (
                <><AlertCircle size={18} /> Your selected graduation date is outside the remaining planning window. Edit your profile.</>
              ) : pace >= 4 || creditsPerSemester > 18 ? (
                <><AlertCircle size={18} /> This graduation target looks aggressive based on what is currently marked complete.</>
              ) : (
                <><CheckCircle2 size={18} /> Your remaining requirements appear spreadable across the semesters you selected.</>
              )}
            </div>
          </section>

          <section className="panel roadmapPanel">
            <div className="panelHeader">
              <div><span className="eyebrow">YOUR PATH TO GRADUATION</span><h2>Plan through {profile.gradTerm} {profile.gradYear}</h2></div>
            </div>
            <div className="semesterScroller">
              {semesters.map((semester) => {
                const ids = normalizedPlan[semester] ?? [];
                return (
                  <article key={semester} className={`semesterCard ${active === semester ? "active" : ""}`} onClick={() => setActiveSemester(semester)}>
                    <div className="semesterCardTop"><strong>{semester}</strong><span>{ids.length} planned</span></div>
                    <div className="semesterCourses">
                      {ids.length === 0 && (
                        <div className="emptySemester">
                          <img src={mascot} alt="RUCSPath mascot" />
                          <strong>No classes here yet</strong>
                          <span>Add a course to start building this semester.</span>
                        </div>
                      )}                      {ids.map((id) => {
                        const course = courses.find((c) => c.id === id);
                        if (!course) return null;
                        const earlier = previousPlannedForSemester(semester, semesters, normalizedPlan);
                        const missing = missingPrerequisites(course, prereqDone, earlier);
                        return (
                          <div className="semesterCourse" key={id}>
                            <div>
                              <strong>{course.short}</strong>
                              <span>{course.title}</span>
                              {missing.length > 0 && <small>Missing C-or-better prerequisite: {missing.join(", ")}</small>}
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeFromSemester(semester, id); }} aria-label={`Remove ${course.short}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <div><span className="eyebrow">CS MAJOR CHECKLIST</span><h2>{profile.degree === "BA" ? "B.A." : "B.S."} Computer Science</h2></div>
            </div>
            <div className="requirementsGrid">
              <RequirementGroup
                title="Required CS"
                items={coreReqs.map((req) => ({ label: req.label, done: requirementSatisfied(req, degreeDone) }))}
              />
              <RequirementGroup
                title="Required Math"
                items={mathRequirements.map((req) => ({ label: req.label, done: requirementSatisfied(req, degreeDone) }))}
              />
              <RequirementGroup
                title="Elective & residency rules"
                items={[
                  { label: `${targets.total} designated electives`, done: stats.total >= targets.total, detail: `${stats.total}/${targets.total}` },
                  { label: `${targets.cs} must be 01:198 CS electives`, done: stats.cs >= targets.cs, detail: `${stats.cs}/${targets.cs}` },
                  { label: `${targets.upperCs} CS electives at 300+ level`, done: stats.upperCs >= targets.upperCs, detail: `${stats.upperCs}/${targets.upperCs}` },
                  { label: `${targets.residency} major courses in Rutgers–NB CS`, done: stats.rutgersCsResidency >= targets.residency, detail: `${stats.rutgersCsResidency}/${targets.residency}` },
                  { label: "CS electives completed within 10 years of graduation", done: true, detail: "Verify only if you have older CS elective credit" },
                  { label: "At most one CS493/CS494 counts as an elective", done: true, detail: "RUCSPath caps Independent Study at one elective" },
                ]}
              />
              <RequirementGroup
                title="Grade rules"
                items={[
                  {
                    label: "No more than one D applied to the major",
                    done: dStatus.withinLimit,
                    detail: dStatus.count === 0 ? "No D grades entered" : `${dStatus.count} D grade${dStatus.count === 1 ? "" : "s"}: ${dStatus.courses.join(", ")}`,
                  },
                  {
                    label: "D grades do not satisfy prerequisites",
                    done: true,
                    detail: "RUCSPath uses C-or-better logic for prerequisite recommendations",
                  },
                ]}
              />
              {profile.degree === "BS" && (
                <RequirementGroup
                  title="B.S. science"
                  items={[
                    {
                      label: "Approved Physics or Chemistry sequence",
                      done: science.complete,
                      detail: science.complete ? "Complete" : `Closest sequence is missing ${science.missingFromBest.map((id) => courses.find((c) => c.id === id)?.short ?? id).join(", ")}`,
                    },
                  ]}
                />
              )}
            </div>
          </section>

          <SASCorePanel sasCore={sasCore} setSasCore={setSasCore} ap={ap} />

          {profile.honorsCollege && (
            <HonorsPanel profile={profile} honors={honors} setHonors={setHonors} />
          )}
        </div>

        <aside className="sideColumn">
          <section className="panel declarationPanel">
            <div className="panelHeader compact">
              <div><span className="eyebrow">MAJOR DECLARATION</span><h2>{declaration.eligible ? "Coursework ready" : "Not ready yet"}</h2></div>
              {declaration.eligible ? <CheckCircle2 size={21} /> : <AlertCircle size={21} />}
            </div>
            {declaration.missing.length > 0 ? (
              <div className="missingList">
                <span>Need C or better / approved equivalent in:</span>
                {declaration.missing.map((item) => <div key={item.key}><Circle size={10} />{item.label}</div>)}
              </div>
            ) : (
              <p className="smallCopy">The five declaration course requirements are marked as C-or-better or approved equivalent.</p>
            )}
            {declaration.usedEquivalentCredit && !declaration.residencyExceptionMet && (
              <div className="miniNotice">
                <Info size={15} /> Some declaration requirements are currently satisfied with AP,
  transfer, or equivalent credit. Rutgers may still require completed
  New Brunswick CS coursework before admission to the major. Confirm
  your declaration status with CS advising.
              </div>
            )}
            <div className="miniNotice neutral">
              <Info size={15} /> Rutgers also lists MATH135 as a possible declaration substitute for MATH151 and ECE312 as a possible declaration substitute for CS205. Confirm substitutions with advising; the degree checklist still follows the published CS major requirements.
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader compact">
              <div><span className="eyebrow">COURSES YOU CAN TAKE NEXT</span><h2>Based on your completed prerequisites</h2></div>
              <Sparkles size={19} />
            </div>
            <div className="recommendationList">
              {recommendations.length === 0 && <p className="smallCopy">No verified-prerequisite recommendations are available from the current data.</p>}
              {recommendations.map((course) => (
                <div className="recommendationRow" key={course.id}>
                  <div>
                    <strong>{course.short}</strong>
                    <span>{course.title}</span>
                    {profile.track !== "None" && course.tracks?.includes(profile.track) && <small>Matches {profile.track}</small>}
                  </div>
                  <button type="button" disabled={!active} onClick={() => addToSemester(course.id)}>Add</button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel catalogPanel">
            <div className="panelHeader compact">
              <div><span className="eyebrow">COURSE CATALOG</span><h2>Add to {active ?? "a semester"}</h2></div>
              <BookOpen size={19} />
            </div>
            <label className="searchBox">
              <Search size={16} />
              <input value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Search Rutgers courses..." />
            </label>
            <div className="filterRow">
              {(["all", "required", "electives", "science"] as const).map((filter) => (
                <button type="button" key={filter} className={catalogFilter === filter ? "selected" : ""} onClick={() => setCatalogFilter(filter)}>
                  {filter === "all" ? "All" : filter === "required" ? "Required" : filter === "electives" ? "Electives" : "Science"}
                </button>
              ))}
            </div>
            <div className="catalogList">
              {catalog.map((course) => {
                const isPlanned = planned.has(course.id);

const earlierPlanned = active
  ? previousPlannedForSemester(active, semesters, normalizedPlan)
  : new Set<string>();

const eligible = prerequisiteSatisfied(
  course,
  prereqDone,
  earlierPlanned
);

                const missing = missingPrerequisites(
                  course,
                  prereqDone,
                  earlierPlanned
                );
                return (
                  <article className="catalogItem" key={course.id}>
                    <div className="catalogItemTop">
                      <div><strong>{course.short}</strong><small>{course.code}</small></div>
                      {course.designatedElective && <span className="tag">Elective</span>}
                    </div>
                    <h3>{course.title}</h3>
                    {eligible === false && (
                      <div className="prereqWarning">
                        <span className="eligibility notReady">
                          Prerequisites not yet met
                        </span>

                        <button
                          className="whyButton"
                          onClick={() =>
                            setWhyOpen(whyOpen === course.id ? null : course.id)
                          }
                        >
                          Why?
                        </button>

                        {whyOpen === course.id && (
                          <div className="whyBox">
                            <strong>You still need:</strong>
                            {missing.map((req) => (
                              <span key={req}>• {req}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {eligible === true && <span className="eligibility ready">Verified prerequisites met</span>}
                    {eligible === null && <span className="eligibility unknown">Verify prerequisites in Schedule of Classes</span>}
                    <button
                      type="button"
                      className="addButton"
                      disabled={!active || isPlanned || eligible === false}
                      onClick={() => addToSemester(course.id)}
                    >
                      {isPlanned
                        ? "Planned"
                        : eligible === false
                          ? "Prerequisite required"
                          : "Add to semester"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </aside>
      </section>
      <section className="aboutRUCSPath">
        <div>
          <span className="eyebrow">ABOUT RUCSPATH</span>
          <h2>Built for Rutgers CS students.</h2>
          <p>
            RUCSPath is a student-built degree planner for Rutgers–New Brunswick Computer Science students.
          </p>
        </div>

        <div className="aboutMeta">
          <span>Requirements reviewed: September 2026</span>
          <span>Not affiliated with Rutgers University</span>
        </div>
      </section>
      <footer className="appFooter">
        Requirement data checked against official Rutgers Computer Science and SAS pages in September 2026. RUCSPath is a student-built planning aid, not an official degree audit. Verify Degree Navigator and the Schedule of Classes before registering or graduating.
      </footer>
    </main>
  );
}

function OverallDegreePanel({
  profile,
  coreSlots,
  majorComplete,
  sasCore,
}: {
  profile: Profile;
  coreSlots: { completed: number; total: number };
  majorComplete: boolean;
  sasCore: SASCoreProgress;
}) {
  const creditMet = profile.earnedCredits >= 120;
  const gpaMet = profile.gpa !== null && profile.gpa >= 2;
  const coreMet = coreSlots.completed === coreSlots.total;
  return (
    <section className="panel">
      <div className="panelHeader">
        <div><span className="eyebrow">RUTGERS SAS REQUIREMENTS</span><h2>Graduation requirements outside your CS major</h2></div>
        <GraduationCap size={20} />
      </div>
      <div className="overallGrid">
<StatusCard
  label="120 total degree credits"
  done={creditMet}
  detail={`${profile.earnedCredits}/120 reported from your Rutgers record`}
/>        <StatusCard label="SAS Core Curriculum" done={coreMet} detail={`${coreSlots.completed}/${coreSlots.total} requirement slots`} />
        <StatusCard label="CS major" done={majorComplete} detail="B.A./B.S. rules below" />
        <StatusCard label="2.000 minimum cumulative GPA" done={gpaMet} neutral={profile.gpa === null} detail={profile.gpa === null ? "GPA not entered yet" : `${profile.gpa.toFixed(2)} entered`} />
        <StatusCard label="Minor" done={false} neutral={true} detail="CS B.A. and B.S. are listed as credit-intensive; SAS permits the minor requirement to be waived. Confirm your program status." />
        <StatusCard
          label="30 of final 42 credits at Rutgers–NB"
          done={sasCore.last42Residency === "met"}
          neutral={sasCore.last42Residency === "unknown"}
          detail={sasCore.last42Residency === "met" ? "Marked met" : sasCore.last42Residency === "not-met" ? "Marked not met" : "Not evaluated yet"}
        />
      </div>
    </section>
  );
}

function SASCorePanel({
  sasCore,
  setSasCore,
  ap,
}: {
  sasCore: SASCoreProgress;
  setSasCore: (s: SASCoreProgress) => void;
  ap: APState;
}) {
  const slots = sasCoreSlots(sasCore, ap);
  return (
    <section className="panel">
      <div className="panelHeader">
        <div><span className="eyebrow">SAS CORE CURRICULUM</span><h2>{slots.completed}/{slots.total} requirement slots marked complete</h2></div>
      </div>
      <div className="coreDashboardGrid">
        <CoreDashboardGroup title="Contemporary Challenges" items={[{ label: "CCD", done: sasCore.ccd }, { label: "CCO", done: sasCore.cco }]} />
        <CoreDashboardGroup title="Natural Sciences" items={[{ label: `NS courses ${sasCore.nsCount}/2`, done: sasCore.nsCount >= 2 }]} />
        <CoreDashboardGroup title="Social & Historical" items={[{ label: "HST", done: sasCore.hst }, { label: "SCL", done: sasCore.scl }]} />
        <CoreDashboardGroup title="Arts & Humanities" items={[{ label: `Distinct AH requirements ${sasCore.ahCount}/2`, done: sasCore.ahCount >= 2 }]} />
        <CoreDashboardGroup title="Writing & Communication" items={[{ label: "College Writing / AP equivalent", done: slots.collegeWriting }, { label: "WCr", done: sasCore.wcr }, { label: "WCd", done: sasCore.wcd }]} />
        <CoreDashboardGroup title="Quantitative Reasoning" items={[{ label: "QQ", done: sasCore.qq }, { label: "QR", done: sasCore.qr }]} />
      </div>
      <div className="coreEditHint">
        <Info size={15} /> Use Degree Navigator as the source of truth. Choose “Edit profile & coursework” at the top, then update the SAS Core step.
      </div>
    </section>
  );
}

function HonorsPanel({
  profile,
  honors,
  setHonors,
}: {
  profile: Profile;
  honors: HonorsProgress;
  setHonors: (h: HonorsProgress) => void;
}) {
  if (profile.honorsCohort === "legacy") {
    return (
      <section className="panel">
        <div className="panelHeader"><div><span className="eyebrow">HONORS COLLEGE</span><h2>Legacy curriculum</h2></div><Award size={20} /></div>
        <p className="smallCopy">Honors College has cohort-specific legacy curricula for students who entered before Fall 2025. RUCSPath intentionally does not flatten those pathways into one checklist; verify your exact Honors curriculum with HC advising.</p>
      </section>
    );
  }

  const requiredHours = profile.honorsJoin === "sophomore" ? 20 : 30;
  const gpaMet = profile.gpa !== null && profile.gpa >= 3.25;
  return (
    <section className="panel">
      <div className="panelHeader"><div><span className="eyebrow">HONORS COLLEGE · FALL 2025+</span><h2>Optional Honors progress</h2></div><Award size={20} /></div>
      <div className="honorsChecklist">
        <ToggleRequirement label="Honors Mission Course experience" checked={honors.mission} onChange={(mission) => setHonors({ ...honors, mission })} />
        <ToggleRequirement label="Global Competence requirement" checked={honors.globalCompetence} onChange={(globalCompetence) => setHonors({ ...honors, globalCompetence })} />
        <div className="honorsRow">
          <div><strong>Community engagement</strong><span>{honors.serviceHours}/{requiredHours} approved hours</span></div>
          <input type="number" min={0} max={200} value={honors.serviceHours} onChange={(e) => setHonors({ ...honors, serviceHours: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div className="honorsRow"><div><strong>Minimum 3.25 term & cumulative GPA</strong><span>{profile.gpa === null ? "Add GPA in profile to check" : `${profile.gpa.toFixed(2)} current GPA`}</span></div>{gpaMet ? <CheckCircle2 size={20} /> : <Circle size={20} />}</div>
        <ToggleRequirement label="Scholar with Distinction capstone (optional distinction)" checked={honors.distinctionCapstone} onChange={(distinctionCapstone) => setHonors({ ...honors, distinctionCapstone })} />
      </div>
    </section>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brandMark">
        <span className="rutgersR">R</span>
      </div>
      <div>
        <strong>RUCSPath</strong>
        <span>Rutgers Computer Science Degree Planner</span>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function APSelect({
  title,
  value,
  onChange,
  note,
}: {
  title: string;
  value: "none" | "4" | "5";
  onChange: (value: "none" | "4" | "5") => void;
  note: string;
}) {
  return <div className="apCard"><strong>{title}</strong><select value={value} onChange={(e) => onChange(e.target.value as "none" | "4" | "5")}><option value="none">No qualifying score</option><option value="4">Score: 4</option><option value="5">Score: 5</option></select><p>{note}</p></div>;
}

function CoreSetupCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <div className="coreSetupCard"><strong>{title}</strong><p>{note}</p><div className="coreSetupControls">{children}</div></div>;
}

function CoreToggle({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="coreToggle"><input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function CountSelect({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return <label className="countSelect"><span>{label}</span><select value={value} onChange={(e) => onChange(Number(e.target.value))}>{Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i} / {max}</option>)}</select></label>;
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div className="reviewItem"><span>{label}</span><strong>{value}</strong></div>;
}

function Metric({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return <div className="metric"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>;
}

function PaceStat({ label, value }: { label: string; value: string | number }) {
  return <div className="paceStat"><span>{label}</span><strong>{value}</strong></div>;
}

function RequirementGroup({ title, items }: { title: string; items: { label: string; done: boolean; detail?: string }[] }) {
  return <div className="requirementGroup"><h3>{title}</h3><div className="requirementRows">{items.map((item) => <div className="requirementRow" key={item.label}>{item.done ? <CheckCircle2 size={17} className="doneIcon" /> : <Circle size={17} className="todoIcon" />}<div><strong>{item.label}</strong>{item.detail && <span>{item.detail}</span>}</div></div>)}</div></div>;
}

function StatusCard({ label, done, detail, neutral = false }: { label: string; done: boolean; detail: string; neutral?: boolean }) {
  return <div className={`statusCard ${done ? "complete" : neutral ? "neutral" : "incomplete"}`}>{done ? <CheckCircle2 size={18} /> : neutral ? <Info size={18} /> : <Circle size={18} />}<div><strong>{label}</strong><span>{detail}</span></div></div>;
}

function CoreDashboardGroup({ title, items }: { title: string; items: { label: string; done: boolean }[] }) {
  return <div className="coreDashGroup"><strong>{title}</strong>{items.map((item) => <div key={item.label}>{item.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}<span>{item.label}</span></div>)}</div>;
}

function ToggleRequirement({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="honorsRow clickable"><div><strong>{label}</strong></div><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>;
}

export default App;
