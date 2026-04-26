# Setup Guide

Platform-specific instructions for getting Career-Ops India running.

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- An **Anthropic API key** — [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

---

## macOS

```bash
# Install Node.js via Homebrew (if not already installed)
brew install node

# Clone and install
git clone https://github.com/your-username/career-ops-india
cd career-ops-india
npm install

# Set your API key (add this to ~/.zshrc or ~/.bash_profile to persist it)
export ANTHROPIC_API_KEY="sk-ant-..."

# Run
node pipeline.js
```

---

## Linux (Ubuntu / Debian)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone https://github.com/your-username/career-ops-india
cd career-ops-india
npm install

# Set your API key (add to ~/.bashrc to persist)
export ANTHROPIC_API_KEY="sk-ant-..."

# Run
node pipeline.js
```

---

## Windows

### Option A — Command Prompt / PowerShell

```cmd
:: Install Node.js from https://nodejs.org (LTS version)
:: Then in a new terminal:

git clone https://github.com/your-username/career-ops-india
cd career-ops-india
npm install

:: Set API key for the current session
set ANTHROPIC_API_KEY=sk-ant-...

:: Or set it permanently (system-wide, takes effect in new terminals)
setx ANTHROPIC_API_KEY "sk-ant-..."

:: Run
node pipeline.js
```

### Option B — WSL2 (recommended for a Unix-like experience)

Follow the Linux instructions above inside your WSL2 terminal.

---

## Verifying your setup

```bash
node pipeline.js --stats
```

If the API key is missing you'll see a clear error with instructions. If it's set correctly you'll see the pipeline banner.

---

## Output files

All generated files land in `outputs/` (gitignored):

| File | Description |
|------|-------------|
| `resume-{role}-{date}.docx/.pdf` | ATS-optimized resume |
| `cover-letter-{role}-{date}.docx/.pdf` | Tailored cover letter |
| `answers-{role}-{date}.md` | 10 interview answers |
| `tracker.csv` | Append-only application history |

---

## Troubleshooting

**`ANTHROPIC_API_KEY is not set`** — The environment variable isn't exported in your current shell. Re-run the `export`/`set` command above, or add it to your shell profile.

**`Cannot find module`** — Run `npm install` first.

**PDF output blank / garbled** — The PDF renderer uses pdfkit. If your CV was a PDF input, the output PDF is generated from the structured JSON (not a converted copy of your original). The DOCX is the primary output; use Word or Google Docs to convert if needed.

**`jszip` / in-place edit fails** — If your `.docx` has an unusual structure, the pipeline falls back to from-scratch DOCX formatting automatically. Check the terminal output for a fallback notice.
