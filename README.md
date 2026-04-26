# Career-Ops India

**AI-powered job application pipeline built for the Indian job market.**

---

## Why this exists

Indian job seekers face a specific set of problems that generic resume tools don't solve:

- **ATS black holes.** Most applications never reach a human. Indian MNCs and startups use ATS systems that filter on exact keyword matches — a strong candidate with a poorly-worded CV gets auto-rejected.
- **JDs full of noise.** Indian job descriptions are notorious for vague filler ("dynamic go-getter", "excellent communication skills", "self-starter") that obscures what the role actually needs.
- **Generic cover letters and outreach.** Most candidates send the same letter to every company. Recruiters can tell.
- **No feedback loop.** You apply, hear nothing, and have no idea if the problem was your CV, the JD mismatch, or the ATS.

Career-Ops India runs your CV and a job description through 7 specialized Claude AI agents. In about 60 seconds you get an ATS-optimized resume, a before/after score comparison, a targeted cover letter, LinkedIn DMs, and 10 interview answers — all grounded in your actual experience, not fabricated.

---

## Agents

| Agent | What it does | Output |
|---|---|---|
| **JD Cleaner** | Strips filler from Indian JDs, extracts must-haves, tech stack, red flags | Structured JSON |
| **Fit Evaluator** | Scores your CV against the JD on 4 dimensions (ATS, skills, experience, recruiter appeal) | Score card + verdict |
| **Resume Writer** | Rewrites 6 bullet points in STAR format with exact JD keywords injected | Rewritten bullets |
| **Resume Builder** | Restructures your full CV as formatted DOCX + PDF, preserving your design if you upload a `.docx` | `.docx` + `.pdf` |
| **ATS Validator** | Re-scores the rewritten resume — shows before/after improvement with delta | Before/after table |
| **Cover Letter** | Writes a 350–400 word cover letter sourced entirely from your rewritten resume | `.docx` + `.pdf` |
| **Answer Generator** | Generates tailored answers for 10 common Indian interview questions (STAR format, salary negotiation, notice period) | `.md` file |

Plus a **LinkedIn Outreach** agent that writes 2 cold DMs (proof-first and curiosity-hook variants, under 80 words each).

---

## Quickstart

```bash
# 1. Clone
git clone https://github.com/Justinsharon/career-ops-india
cd career-ops-india

# 2. Install dependencies
npm install

# 3. Set your Anthropic API key
#    Windows:
setx ANTHROPIC_API_KEY "sk-ant-..."
#    macOS / Linux:
export ANTHROPIC_API_KEY="sk-ant-..."

# 4. Run
node pipeline.js
```

Get your API key at [console.anthropic.com](https://console.anthropic.com).

### Other commands

```bash
node pipeline.js --stats    # Print aggregate history from tracker.csv
node pipeline.js --update   # Update application status (applied → interviewed / offer / rejected)
```

---

## Cost

Each pipeline run calls 8 Claude API requests (Sonnet 4.6). A typical run costs **~$0.005**.

You pay your own Anthropic API usage — there is no subscription, no middleman, no data sent anywhere except the Anthropic API.

---

## Sample output

```
╔══════════════════════════════════════════════╗
║  🚀  Career-Ops India v2                     ║
║  AI-Powered Job Application Pipeline         ║
╚══════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧹  CLEANED JOB DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Role:          Senior Backend Engineer
  Company Type:  startup
  Experience:    3–6 yrs
  Salary:        ₹25-40 LPA

  Must Have:
  ✓ Node.js  ✓ PostgreSQL  ✓ AWS  ✓ REST APIs

  Red Flags:
  ⚠ "We work hard and play harder" — startup grind culture signal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊  FIT EVALUATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ATS Score             ████████░░░░  6/10
  Skill Overlap         ██████░░░░░░  5/10
  Experience Fit        ████████████  9/10
  Recruiter Likelihood  ███████░░░░░  6/10

  Overall Fit: 6.5/10  (65%)
  ATS Pass:    MEDIUM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈  ATS SCORE IMPROVEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Overall:    6.5/10    →   8.5/10    (+2.0)
  ATS:        6/10      →   9/10      (+3)
  ATS Pass:   MEDIUM    →   HIGH

  💾 Resume saved → outputs/resume-senior-backend-engineer-2026-04-26.docx
  💾 Cover letter saved → outputs/cover-letter-senior-backend-engineer-2026-04-26.docx

  ✅  All done! Good luck with your application.
```

---

## Architecture

```
INPUT: CV (.pdf / .docx / .txt / paste) + Job Description text
         │
         ▼
┌────────────────────────────────────┐
│  Stage 1 — parallel                │
│  jd_cleaner       fit_evaluator    │
└─────────────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────┐
│  Stage 2 — parallel                │
│  resume_writer    outreach_agent   │
└─────────────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────┐
│  Stage 3                           │
│  resume_final → DOCX + PDF saved   │
└─────────────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────┐
│  Stage 4 — parallel                │
│  ats_validator                     │
│  cover_letter → DOCX + PDF saved   │
│  answer_generator → .md saved      │
└─────────────────┬──────────────────┘
                  │
┌─────────────────▼──────────────────┐
│  Stage 5                           │
│  tracker.csv append + stats print  │
└────────────────────────────────────┘

outputs/
  resume-{role}-{date}.docx/.pdf
  cover-letter-{role}-{date}.docx/.pdf
  answers-{role}-{date}.md
  tracker.csv                          ← append-only application log
```

---

## Roadmap

### Phase 3 (planned)

- [ ] **Batch mode** — process multiple JDs against one CV in a single run
- [ ] **JD URL input** — paste a LinkedIn/Naukri URL instead of raw text
- [ ] **Resume template picker** — choose between standard, two-column, and compact layouts
- [ ] **Follow-up email generator** — post-interview thank-you and follow-up drafts
- [ ] **Salary negotiation script** — generates a counter-offer script based on market data in the JD
- [ ] **Portfolio/GitHub analyzer** — optional agent that reviews public work and suggests what to highlight
- [ ] **Status dashboard** — HTML view of `tracker.csv` with filters and charts
- [ ] **Prompt caching** — reduce API cost by caching system prompts across multi-run sessions

---

## Project structure

```
pipeline.js          CLI entry point, 5-stage orchestrator
agents/
  prompts.js         System prompts for all 8 agents
  fileUtils.js       File I/O: CV reading (PDF/DOCX/TXT) + DOCX/PDF/MD output
  render.js          Terminal rendering with chalk
  tracker.js         CSV application history (logRun, printStats, rewriteTracker)
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

---

## Setup

For platform-specific installation instructions, see [SETUP.md](SETUP.md).
