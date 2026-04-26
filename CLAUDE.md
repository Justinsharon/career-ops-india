# Career-Ops India v2 — Project Memory

## What this tool does

Career-Ops India v2 is a CLI pipeline that helps **Indian job seekers with 0–4 years of experience** optimize their job applications using 7 AI agents powered by the Anthropic Claude API.

## Target users

- Freshers and early-career professionals in India
- Applying to roles in tech, product, finance, consulting, and operations
- Struggling with ATS rejections, low response rates, or generic CVs

---

## The 7 Agents

### 1. `jd_cleaner`
**Purpose:** Parse Indian job descriptions and extract structured signal.

- Strips filler phrases common in Indian JDs ("good communication skills", "self-starter", "dynamic personality")
- Separates must-have vs nice-to-have requirements
- Identifies the real job title, team size/type, tech stack, and seniority signals
- Returns clean JSON: `{ role, company, must_have[], good_to_have[], tech_stack[], red_flags[], summary }`

### 2. `fit_evaluator`
**Purpose:** Score a candidate's CV against the cleaned JD on 5 dimensions (each out of 10).

Dimensions:
1. **Technical Skills** — stack match, tools, languages
2. **Domain Experience** — industry/sector relevance
3. **Seniority Fit** — YOE alignment, scope of past roles
4. **ATS Keywords** — keyword density vs JD
5. **Communication** — CV clarity, grammar, specificity of bullets

Returns: scores object + overall percentage + a 3-line verdict.

### 3. `resume_writer`
**Purpose:** Rewrite CV bullet points to mirror JD keywords for ATS pass-through.

- Rewrites 5–8 bullets using the STAR format
- Injects exact keywords and phrases from the JD
- Avoids generic phrases; uses numbers and impact wherever possible
- Tailors tone to company type (startup vs MNC vs FAANG)

### 4. `outreach_agent`
**Purpose:** Write 2 LinkedIn DMs (under 80 words each) for cold outreach.

- **DM 1:** Proof-first — opens with a specific achievement or result from the CV
- **DM 2:** Curiosity-hook — opens with a question about the company/role
- Avoids "I came across your profile" openers
- Personalized to the JD and company context
- Ends with a soft CTA (not "please refer me")

### 5. `ats_validator`
**Purpose:** Re-score the rewritten resume against the original JD to measure ATS improvement.

- Runs after `resume_writer` + `resume_final` have produced the optimized resume
- Uses the same 4 scoring dimensions as `fit_evaluator` (ats_score, skill_overlap, experience_fit, recruiter_likelihood)
- Returns `matched_keywords` (JD keywords now present) and `still_missing` (gaps remaining)
- Output is rendered as a before vs after comparison table with color-coded deltas (green = improved, yellow = unchanged, red = dropped)

### 6. `cover_letter`
**Purpose:** Generate a full professional cover letter using the REWRITTEN RESUME (not the original CV) as the source of truth.

- Runs in parallel with `ats_validator` and `answer_generator` (Stage 4) — all three use `resumeFinalData`
- Source of truth is the structured JSON from `resume_final` — the cover letter echoes the same ATS-optimised bullets and metrics the candidate submits
- Returns strict JSON: `candidate_name`, `candidate_contact`, `date`, `hiring_manager`, `company_name`, `role_title`, `opening_paragraph`, `body_paragraph_1`, `body_paragraph_2`, `closing_paragraph`, `signature`
- Saved as `outputs/cover-letter-{slug}-{date}.docx` + `.pdf` (Times New Roman, 1-inch margins, letter layout)
- DOCX layout: name (14pt bold) → contact (10pt) → date → greeting → company/role → 4 paragraphs → signature
- Banned phrases: "I am writing to apply", "herewith submitting", "dynamic professional", "passionate about"

### 7. `answer_generator`
**Purpose:** Generate tailored answers for 10 common Indian interview and application questions.

- Runs in parallel with `ats_validator` (Stage 4) — inputs are CV + cleaned JD + fit evaluation data
- Grounds every answer strictly in the candidate's CV — no invented experience
- Mirrors JD keywords naturally; avoids Indian corporate filler phrases
- Returns strict JSON with 10 keys: `tell_me_about_yourself`, `why_this_role`, `why_hire_you`, `biggest_achievement`, `why_leaving_current_role`, `notice_period_response`, `salary_expectation_response`, `strengths[]`, `weaknesses[]`, `questions_to_ask_interviewer[]`
- Strengths map to JD `must_have` skills; weaknesses are genuine but never role-critical
- Saved as `outputs/answers-{slug}-{date}.md` with one markdown section per question

---

## Architecture

```
pipeline.js          ← CLI entry point
agents/
  prompts.js         ← System prompts for all 7 agents
  fileUtils.js       ← CV file reading (PDF/DOCX/TXT) + DOCX/PDF/MD output
  render.js          ← Terminal rendering (chalk)
  tracker.js         ← CSV application history log (logRun, readTracker, printStats, rewriteTracker)
outputs/
  resume-{role}-{date}.docx        ← formatted Word resume
  resume-{role}-{date}.pdf         ← PDF version
  cover-letter-{role}-{date}.docx  ← cover letter (Times New Roman, letter layout)
  cover-letter-{role}-{date}.pdf   ← PDF version
  answers-{role}-{date}.md         ← interview prep answers (markdown)
  tracker.csv                      ← append-only application log (19 fields)
```

## Run order

1. User provides CV (file path or paste) and JD text
2. `jd_cleaner` + `fit_evaluator` run **in parallel** (Stage 1)
3. `resume_writer` + `outreach_agent` run **in parallel** (Stage 2, uses jd_cleaner output)
4. `resume_final` generates structured JSON resume → saved as DOCX + PDF (Stage 3)
5. `ats_validator` + `cover_letter` + `answer_generator` run **in parallel** (Stage 4)
   - All three receive `resumeFinalData` (the structured JSON rewritten resume from Stage 3)
   - `ats_validator` re-scores the rewritten resume → before/after comparison printed
   - `cover_letter` generates a full cover letter → saved as `cover-letter-{slug}-{date}.docx` + `.pdf`
   - `answer_generator` generates 10 interview answers → saved as `answers-{slug}-{date}.md`
6. `logRun` appends a row to `tracker.csv` (19 fields, including `cover_letter_generated`); `printStats` prints aggregate history (Stage 5)

## Pipeline Memory

`outputs/tracker.csv` is an append-only log of every pipeline run. Each row captures:
- Role, company type, experience range, salary band (from `jd_cleaner`)
- Before/after overall scores and ATS probability (from `fit_evaluator` → `ats_validator`)
- Score improvement delta, matched/missing/still-missing skill counts
- Still-missing skill names (pipe-separated, used for cross-run stats)
- Path to the generated DOCX and first 100 chars of the JD (for identification)
- `status` field (defaults to `"applied"`, updatable to `interviewed/rejected/offer`)

`printStats()` runs after every pipeline execution and shows aggregate history:
total applications, average improvement, best-scoring role, ATS distribution, and top 3 recurring skill gaps.

Never delete or overwrite `tracker.csv` — it is the user's application history.

## Resume Output Modes

There are two mutually exclusive paths for generating the final resume DOCX:

### Mode 1 — In-Place Edit (`.docx` input)
Triggered when user uploads a `.docx` file. Preserves the original resume design (fonts, colors, column layout, section headers) and only replaces bullet point text with ATS-optimised rewrites.

**How it works:**
1. `jszip` unpacks `word/document.xml` from the original `.docx`
2. `extractBullets()` scans paragraphs with `<w:numPr>` (OOXML bullet marker) and extracts their text + segment index
3. `parseRewritePairs()` parses the `resume_writer` markdown output for `**[Original]:**` / `**[Rewritten]:**` pairs
4. `matchRewrittenBullets()` fuzzy-matches (normalised, first 18–25 chars) pairs to extracted bullets
5. `replaceBulletText()` replaces only the `<w:t>` text nodes inside matched paragraphs — first run gets the full new text, subsequent runs are cleared; all `<w:rPr>` run properties (font, color, size, bold) are untouched
6. Modified XML is re-zipped (DEFLATE) and saved as `outputs/resume-{slug}-{date}.docx`
7. PDF is rendered separately from `resume_final` JSON via pdfkit (can't convert DOCX→PDF in Node)

If in-place editing fails, the pipeline falls back to Mode 2 automatically.

### Mode 2 — From-Scratch Formatting (`.pdf` / `.txt` / paste input)
Triggered when user uploads a PDF or pastes text. `resume_final` generates structured JSON → `saveDocx` builds a new DOCX using `docx` package (Times New Roman, standard layout). This was the only mode before Phase 2 Feature 4.

**PDF warning:** When a PDF is uploaded, the user is shown a clear prompt offering to either continue with from-scratch formatting or exit to convert their PDF to `.docx` using Word or Google Docs.

## Key decisions

- Uses `@anthropic-ai/sdk` with direct `messages.create` calls for each agent
- ESM (`"type": "module"`) throughout
- All JSON-returning agents use `extractJSON()` + `unwrapFitData()` to robustly handle code fences and nested keys
- Outputs per run: `resume-*.docx/.pdf` + `cover-letter-*.docx/.pdf` + `answers-*.md`
- `resume_final` returns structured JSON (not plain text) so `saveDocx` has full formatting control (Mode 2) and pdfkit PDF generation (both modes)
