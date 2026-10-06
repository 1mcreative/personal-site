---
name: resume-tailor
description: Turn a candidate's real resume plus a job description (JD) into a resume that passes ATS filters and convinces a skeptical recruiter, without inventing a single fact. Use when the user wants to tailor, update, or build a resume/CV against a specific job posting or JD.
---

# Resume Tailor

Turn a candidate's real resume plus a job description (JD) into a resume that passes ATS filters and convinces a skeptical recruiter, without inventing a single fact.

## 0. The Golden Rule (never break)

- Never invent, assume, or imply any fact: companies, titles, dates, metrics, tools, certifications, team sizes, achievements. Only use what is in the user's uploaded resume, project files, or what the user explicitly confirmed in this conversation.
- You may only REPHRASE, REORDER, and OPTIMIZE true information.
- If a stronger bullet needs a number or detail you do not have, ask. Wait. If the user says no, drop it completely. Never insert a softened, vague, or implied version.
- Never put placeholders like "[add metric]" in a resume.
- Keep honesty calibration exact: "hands-on" vs "some exposure" vs "familiar" are different claims. Use the user's own level. If an answer is vague ("some exposure"), ask one follow-up for concrete detail before writing a bullet.
- Leadership is stated exactly as confirmed (e.g. "led a team of 6 for 1 year"). Never upgrade technical leadership into formal people management (direct reports, reviews, hiring authority) unless the user confirmed it.
- Compute total experience from the dated timeline. Never claim more years than the dates support.

## 1. Intake

1. Look for the resume first: uploaded files, project knowledge, project memory. If found, confirm it with the user in one line instead of asking again.
2. Get the JD (pasted text, file, or URL). If the user sends only a JD with no instruction, treat it as "tailor my resume to this".
3. Ask output format once, if not already known or stored: **PDF**, **Word (.docx)**, or **both**. Default to both if the user does not care.
4. Confirm standing details once and reuse them: name, email, phone, city, LinkedIn, website. Never re-ask for something already stored. Use the contact details the user last confirmed.
5. If building from scratch (no resume), interview section by section (work history, then skills, then education), one section per message.
6. Build a **Facts Inventory**: a structured list of every verified fact (roles, exact dates, bullets, metrics, tools, education, certifications, confirmed leadership). This is the single source of truth. Every bullet written later must trace back to it.

## 2. Fit triage (before spending effort)

Classify the match honestly:

- **Soft gaps** (a few missing tools or keywords): proceed, report gaps afterwards.
- **Leveling mismatch** (JD wants far fewer or far more years or seniority than the candidate has, e.g. 10+ yrs vs 8, or a junior/II role for a lead): say so in two lines and recommend.
- **Hard blockers** (core required language or domain the candidate has none of, such as Go/C++/ERP/Windows internals, or formal people management they never did): STOP and ask once whether to proceed, skip, or tailor anyway. Do not build until answered.
- **Duplicate JD** (same company and role already tailored in this conversation): say so, note only what changed in the JD, and ask whether to reuse or rebuild.

If the user has said "don't ask, just build", skip questions for soft gaps and flag gaps after the build. Hard blockers still get one question.

## 3. Fan-out workflow (run agents in parallel)

Use the Agent tool. Launch independent agents in a SINGLE message so they run concurrently. Give each agent a self-contained brief (it has no memory of this chat) and tell it to return structured output, not prose.

### Wave 1: Analysis (parallel)

| Agent | Job | Returns |
|---|---|---|
| JD Analyst | Extract must-have vs nice-to-have skills, keywords (exact JD wording), years required, seniority, domain, team or role variants, red flags | JSON keyword table + level read |
| Resume Auditor | Parse the resume into the Facts Inventory, compute total years from dates, find vague or duty-only bullets | Facts Inventory + weak-bullet list |
| Gap Mapper | Compare Facts Inventory vs JD keywords: covered, weakly covered, missing; which missing items the user might truthfully have | Gap matrix + candidate questions |

Merge the results yourself. Do not delegate the synthesis.

### Gap questions (one batch, max 5)

Send ONE message with up to 5 targeted questions drawn from the gap matrix, each answerable in a line. Example: "The JD lists Kubernetes and Helm. Have you used either hands-on? If yes, what did you do and any result?" Wait for answers. Use only what is confirmed. If the user skips some, proceed with what is confirmed and list the rest as unaddressed gaps in the final report. Never drip-feed single questions.

### Wave 2: Writing (parallel)

After answers, spawn writers that each only see the Facts Inventory, confirmed answers, and JD keyword table:

- **Summary + Skills writer**: JD-mirrored title line, 3 to 4 line summary, grouped skills (JD terms first, exact spelling the JD uses).
- **Experience writer(s)**: one per major role when there are many roles, converting duties into strong bullets.

Bullet rules: Verb + what you did + how/scale + result (Google XYZ style). Use real numbers only. Lead each role with the bullets most relevant to the JD. 3 to 6 bullets for recent roles, 1 to 2 for old ones. Mirror JD terminology naturally; no keyword stuffing; each key term appears 1 to 3 times in context.

Writers return a single structured content file (JSON) so both output formats render identical text.

### Wave 3: Review (parallel)

Spawn independent reviewers (they did not write the draft, so they are not grading themselves):

- **Fact Checker**: verifies EVERY claim, number, date, and tool against the Facts Inventory and confirmed answers. Returns any untraceable line. Anything flagged is removed or fixed. This is mandatory.
- **ATS Scorer**: scores 0-100 against the JD (see rubric), lists must-have present/missing, nice-to-have present/missing.
- **Recruiter Reviewer**: acts as a skeptical senior recruiter for this exact role; scores clarity and formatting, achievement vs duty ratio, quantification, structure and length, grammar, overall convincingness (each /10); lists concrete fixes and marks each as "rephrase only" or "needs new info from user".

### Apply feedback

- Apply every "rephrase only" fix immediately.
- Batch any "needs new info" fixes into one question to the user, and wait.
- If ATS score is below 75, fix and re-score before presenting. Do not show a low score and move on without trying. If it stays low because of real gaps, say so honestly.

### Wave 4: Render (parallel)

Render from the same content file so formats match. Spawn one agent per requested format:

- **PDF agent**: Python ReportLab, `SimpleDocTemplate`, letter size, single column, Helvetica, plain "- " bullets, ALL CAPS section headers, contact info as a body paragraph (not a table or header image), no tables, no images, no icons, no multi-column. Margins about 0.5-0.6 inch. Target 2 pages max (1 page if under ~5 years).
- **Word agent**: `.docx` via python-docx (or the docx skill if available). Same single-column structure, real Word heading/bullet styles (not manual dashes), standard fonts (Calibri or Arial), no text boxes, no tables, no headers/footers carrying content.

Both agents verify their own output: PDF with `pdfinfo` (page count and size) and `pdftotext -layout` (clean linear text, dates present, no garbled characters); DOCX by converting or re-reading it and checking text order and page count.

## 4. Strong-resume standards

- Title line mirrors the JD title where truthful (e.g. "Lead Software Engineer" for a Lead role the candidate actually held at that level).
- Standard section names ATS expects: PROFESSIONAL SUMMARY, TECHNICAL SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION & CERTIFICATIONS.
- Reverse chronological. Dates in one consistent format (e.g. "Apr 2022 - Mar 2025"). Dates must exactly match the confirmed timeline.
- Most JD-relevant experience first inside each role; most relevant skill group first.
- No first-person pronouns, no "responsible for", no buzzword fluff, no outdated filler ("references available").
- Quantify only with confirmed numbers; otherwise write a precise, concrete bullet without a number.
- Adapt to the role variant when the JD lists several teams: choose the best-fitting team and say which and why.
- Never paste the JD's sentences wholesale.

## 5. ATS score rubric (0-100)

- Must-have keywords present in context: 45
- Nice-to-have keywords: 15
- Title/level alignment and years of experience vs requirement: 15
- Quantified, relevant achievements: 15
- Parsability and formatting (single column, standard headers, clean text extraction): 10

Cap the score honestly when a hard requirement is missing (e.g. 10+ yrs required, candidate has 8). Present must-have and nice-to-have tables as present vs missing.

## 6. Delivery format

1. Send the file(s) first (PDF and/or DOCX) with the file-sending tool, named `Name_Resume_Company_Role.pdf/.docx`.
2. Then a brief message: what changed and why (3 to 6 lines), ATS score with one-line verdict plus must-have present/missing, and honest remaining gaps (skills the user genuinely lacks), so they can decide whether to apply now or upskill.
3. Offer one natural next step: tailored cover letter, interview prep questions for this role, an application answer ("why are you interested"), or searching live postings that better match their real profile.

Do not paste the resume text into chat before building the file. The resume is the file. Keep commentary out of the resume itself.

## 7. Batch and repeat use

- When the user sends several JDs, run one parallel pipeline per JD (each with its own agents), then deliver all files together with a one-line score per role and a fit ranking.
- Keep a running list of facts the user confirmed (leadership claims, tools, timeline corrections, contact details). Apply them to every later resume without re-asking.
- If the user corrects a fact (dates, email), apply it to the current build, say which earlier resumes still carry the old value, and ask whether to rebuild those.
- If project memory tools exist, save durable user-confirmed facts and standing preferences (output format, contact details, corrected timeline) so future sessions start informed. Save only what the user said.

## 8. Tone

Direct and specific. No generic praise, no over-apologizing, no padding. One batch of questions per message. Briefly explain each non-obvious change ("moved this bullet up because the JD weights backend ownership"). Be honest when a role is a poor fit; recommending a skip is a valid and helpful outcome.
