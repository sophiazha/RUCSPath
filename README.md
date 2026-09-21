# RUCSPath

A Rutgers–New Brunswick Computer Science degree planner built with React and TypeScript.

RUCSPath is a degree planner I built for Rutgers–New Brunswick Computer Science students. It helps students keep track of B.A./B.S. requirements, completed coursework, prerequisites, and the semesters they have left before graduation. 

## Features 

1. **Grade-aware coursework**
   - Students enter the grade earned for each Rutgers course.
   - A D can count toward a major requirement only within Rutgers' one-D limit.
   - A D never satisfies a prerequisite.
   - Major-declaration checks use C-or-better logic.
   - Transfer/equivalent courses are tracked separately from Rutgers grades.

2. **SAS degree progress**
   - 120-credit graduation minimum
   - 2.000 cumulative GPA minimum
   - SAS Core requirement tracker
   - 30-of-last-42 Rutgers–New Brunswick residency reminder
   - minor-waiver information for the credit-intensive CS major

3. **CS Intro Sequence**
   - The student enters when they first enrolled at Rutgers–New Brunswick.
   - RUCSPath automatically chooses the legacy CS111/112 path or the new CS120/121/122 path based on the student's timeline, the current semester, and any legacy coursework already entered.
   - New-sequence students can enter their CS placement result.
   - AP CSA mappings automatically change between the legacy and new intro sequences.

## Personalized onboarding

The setup asks for:

- Computer Science B.A. or B.S.
- first Rutgers–New Brunswick semester
- expected graduation term/year
- total degree credits already earned
- current GPA (optional)
- optional CS interest track
- optional Honors College status
- AP Computer Science A / CSP
- AP Calculus AB / BC
- AP Chemistry
- AP English Language/Literature
- CS placement result when the new sequence applies
- completed Rutgers / transfer coursework
- Rutgers grades for completed courses
- SAS Core progress from Degree Navigator

## Degree requirement tracking

The dashboard tracks:

- six required CS core requirements
- MATH151, MATH152, MATH250
- B.A. vs. B.S. designated elective counts
- minimum number of `01:198` CS electives
- minimum number of 300+ CS electives
- Rutgers–New Brunswick CS residency requirement
- B.S. Physics/Chemistry sequence requirement
- one-D maximum for courses applied to the major
- C-or-better prerequisite logic
- major-declaration eligibility
- the special declaration rule for students using equivalent credit for CS111/112/205

## SAS Core tracker

The app lets a student mirror their Degree Navigator status for:

- CCD
- CCO
- two NS courses
- HST
- SCL
- two distinct AH requirements
- College Writing / approved AP exemption
- WCr
- WCd
- QQ
- QR

The UI explicitly reminds users when Rutgers requires separate courses for paired goals such as HST/SCL, WCr/WCd, QQ/QR, and the two AH requirements.

## Graduation pacing

The app reads the current semester from the browser and compares it with the user's target graduation. It calculates:

- remaining Fall/Spring semesters
- estimated major courses remaining
- suggested major-course pace per semester
- credits remaining to 120
- average credits per remaining semester

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```


## Important disclaimer

RUCSPath is a student-built planning project, **not an official Rutgers advising or degree-audit tool**! It is a work in progress still. Requirements change and individual student records may contain exceptions. Students should confirm final requirements with Degree Navigator, the Schedule of Classes, and an academic advisor.

Requirement data in this project was checked against official Rutgers pages in September 2026.
