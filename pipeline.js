#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { readCVFile, saveDocx, saveDocxInPlace, saveAnswers, saveCoverLetter } from './agents/fileUtils.js';
import { logRun, printStats, readTracker, rewriteTracker } from './agents/tracker.js';
import { banner, renderScore, renderJD, renderText, renderAtsComparison, renderAnswersSummary, renderCoverLetterSummary } from './agents/render.js';
import {
  JD_CLEANER_PROMPT,
  FIT_EVALUATOR_PROMPT,
  RESUME_WRITER_PROMPT,
  RESUME_FINAL_PROMPT,
  OUTREACH_AGENT_PROMPT,
  ATS_VALIDATOR_PROMPT,
  ANSWER_GENERATOR_PROMPT,
  COVER_LETTER_PROMPT,
} from './agents/prompts.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌  ANTHROPIC_API_KEY is not set.\n');
  console.error('To fix this, run:');
  console.error('  export ANTHROPIC_API_KEY=sk-ant-...\n');
  console.error('Get your key at: https://console.anthropic.com/settings/keys\n');
  process.exit(1);
}

const client = new Anthropic();

function extractJSON(raw) {
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return raw.trim();
  return raw.slice(first, last + 1);
}

function unwrapFitData(parsed) {
  if (typeof parsed.ats_score === 'number') return parsed;
  for (const key of ['scores', 'verdict', 'result', 'evaluation', 'data']) {
    const nested = parsed[key];
    if (nested && typeof nested === 'object' && typeof nested.ats_score === 'number') {
      return { ...nested, verdict: typeof parsed.verdict === 'string' ? parsed.verdict : (nested.verdict || '') };
    }
  }
  return parsed;
}

async function runAgent(systemPrompt, userMessage, label) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function getCVText() {
  const { cvSource } = await inquirer.prompt([
    {
      type: 'list',
      name: 'cvSource',
      message: 'How would you like to provide your CV?',
      choices: [
        { name: 'File path (.pdf, .docx, .txt)', value: 'file' },
        { name: 'Paste text directly', value: 'paste' },
      ],
    },
  ]);

  if (cvSource === 'file') {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter path to your CV file:',
        validate: v => v.trim().length > 0 || 'Please enter a file path',
      },
    ]);

    const resolvedPath = path.resolve(filePath.trim());
    const ext = path.extname(resolvedPath).toLowerCase();

    if (ext === '.pdf') {
      console.log(chalk.yellow(
        '\n  ⚠  PDF detected. DOCX in-place editing requires a .docx file.\n' +
        '     To preserve your resume design, convert to .docx using Word or Google Docs.\n'
      ));
      const { choice } = await inquirer.prompt([{
        type: 'list',
        name: 'choice',
        message: 'How would you like to continue?',
        choices: [
          { name: 'Continue with from-scratch formatting (generates a new design)', value: 'continue' },
          { name: 'Exit — I will convert my PDF to .docx and re-run', value: 'exit' },
        ],
      }]);
      if (choice === 'exit') {
        console.log(chalk.dim('\n  Tip: Open PDF in Google Docs → File → Open → Upload → Download as .docx\n'));
        process.exit(0);
      }
      const text = await readCVFile(resolvedPath);
      return { text, originalDocxPath: null };
    }

    const text = await readCVFile(resolvedPath);
    return { text, originalDocxPath: ext === '.docx' ? resolvedPath : null };
  }

  const { cvText } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'cvText',
      message: 'Paste your CV text (editor will open):',
    },
  ]);
  return { text: cvText, originalDocxPath: null };
}

async function getJDText() {
  const { jdText } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'jdText',
      message: 'Paste the job description (editor will open):',
    },
  ]);
  return jdText;
}

async function main() {
  banner();

  console.log('  Provide your CV and the job description to get started.\n');

  const { text: cvText, originalDocxPath } = await getCVText();
  const jdText = await getJDText();

  if (!cvText?.trim() || !jdText?.trim()) {
    console.error('\n❌  CV and JD cannot be empty. Exiting.\n');
    process.exit(1);
  }

  // Stage 1: jd_cleaner + fit_evaluator in parallel
  const stage1Spinner = ora('Running JD Cleaner + Fit Evaluator…').start();

  const [jdRaw, fitRaw] = await Promise.all([
    runAgent(JD_CLEANER_PROMPT, `JOB DESCRIPTION:\n${jdText}`, 'jd_cleaner'),
    runAgent(
      FIT_EVALUATOR_PROMPT,
      `CANDIDATE CV:\n${cvText}\n\n---\n\nJOB DESCRIPTION:\n${jdText}`,
      'fit_evaluator'
    ),
  ]);

  stage1Spinner.succeed('Stage 1 complete');

  let jdData;
  try {
    jdData = JSON.parse(extractJSON(jdRaw));
  } catch {
    jdData = { role: 'Unknown', summary: jdRaw };
  }

  let fitData;
  try {
    fitData = unwrapFitData(JSON.parse(extractJSON(fitRaw)));
  } catch {
    fitData = { ats_score: 0, skill_overlap: 0, experience_fit: 0, recruiter_likelihood: 0, overall: 0, verdict: fitRaw };
  }

  // Stage 2: resume_writer + outreach_agent in parallel
  const stage2Spinner = ora('Running Resume Writer + Outreach Agent…').start();

  const jdJson = JSON.stringify(jdData, null, 2);
  const [resumeOutput, outreachOutput] = await Promise.all([
    runAgent(
      RESUME_WRITER_PROMPT,
      `CANDIDATE CV:\n${cvText}\n\n---\n\nCLEANED JD (JSON):\n${jdJson}`,
      'resume_writer'
    ),
    runAgent(
      OUTREACH_AGENT_PROMPT,
      `CANDIDATE CV:\n${cvText}\n\n---\n\nCLEANED JD (JSON):\n${jdJson}`,
      'outreach_agent'
    ),
  ]);

  stage2Spinner.succeed('Stage 2 complete');

  const role = jdData.role || 'role';
  const date = new Date().toISOString().slice(0, 10);
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Stage 3: generate full rewritten resume → in-place edit (if .docx) or from-scratch
  const docxSpinner = ora('Generating resume…').start();
  let docxPath = null;
  let pdfPath = null;
  let resumeData = null;
  try {
    const resumeJsonRaw = await runAgent(
      RESUME_FINAL_PROMPT,
      `ORIGINAL CV:\n${cvText}\n\n---\n\nATS-OPTIMIZED BULLETS:\n${resumeOutput}`,
      'resume_final'
    );
    resumeData = JSON.parse(extractJSON(resumeJsonRaw));

    if (originalDocxPath) {
      try {
        const saved = await saveDocxInPlace(originalDocxPath, slug, resumeOutput, date, resumeData);
        docxPath = saved.docx;
        pdfPath = saved.pdf;
        docxSpinner.succeed(
          `Resume saved — in-place edit, preserved your design (${saved.matchedCount}/${saved.totalPairs} bullets updated${pdfPath ? ' + PDF' : ''})\n`
        );
      } catch (inPlaceErr) {
        console.error(chalk.dim(`\n  ⚠  In-place edit failed (${inPlaceErr.message}) — falling back to from-scratch…`));
        const saved = await saveDocx(slug, resumeData, date);
        docxPath = saved.docx;
        pdfPath = saved.pdf;
        docxSpinner.succeed(`Resume saved with from-scratch formatting (DOCX${pdfPath ? ' + PDF' : ''})\n`);
      }
    } else {
      const saved = await saveDocx(slug, resumeData, date);
      docxPath = saved.docx;
      pdfPath = saved.pdf;
      docxSpinner.succeed(`Resume saved with from-scratch formatting (DOCX${pdfPath ? ' + PDF' : ''})\n`);
    }
  } catch (err) {
    docxSpinner.fail(`Resume generation failed: ${err.message}`);
  }

  // Stage 4: ATS Validator + Answer Generator + Cover Letter in parallel
  // All three receive resumeData (the rewritten resume JSON from Stage 3)
  const stage4Spinner = ora('Running ATS Validator + Answer Generator + Cover Letter…').start();
  let atsAfter = null;
  let answersData = null;
  let clData = null;
  const stage4Errors = [];

  const resumeJson = resumeData ? JSON.stringify(resumeData, null, 2) : null;
  const fitJson = JSON.stringify(fitData, null, 2);

  const atsPromise = resumeData
    ? runAgent(
        ATS_VALIDATOR_PROMPT,
        `REWRITTEN RESUME:\n${resumeJson}\n\n---\n\nJOB DESCRIPTION:\n${jdText}`,
        'ats_validator'
      ).then(raw => { atsAfter = JSON.parse(extractJSON(raw)); })
        .catch(err => stage4Errors.push(`ATS Validator: ${err.message}`))
    : Promise.resolve();

  const answersPromise = runAgent(
    ANSWER_GENERATOR_PROMPT,
    `CANDIDATE CV:\n${cvText}\n\n---\n\nCLEANED JD (JSON):\n${jdJson}\n\n---\n\nFIT EVALUATION:\n${fitJson}`,
    'answer_generator'
  ).then(raw => { answersData = JSON.parse(extractJSON(raw)); })
    .catch(err => stage4Errors.push(`Answer Generator: ${err.message}`));

  const coverLetterPromise = resumeData
    ? runAgent(
        COVER_LETTER_PROMPT,
        `REWRITTEN RESUME (JSON):\n${resumeJson}\n\n---\n\nCLEANED JD (JSON):\n${jdJson}\n\n---\n\nFIT EVALUATION:\n${fitJson}`,
        'cover_letter'
      ).then(raw => { clData = JSON.parse(extractJSON(raw)); })
        .catch(err => stage4Errors.push(`Cover Letter: ${err.message}`))
    : Promise.resolve();

  await Promise.all([atsPromise, answersPromise, coverLetterPromise]);

  if (stage4Errors.length) {
    stage4Spinner.warn(`Stage 4 partial — ${stage4Errors.join('; ')}`);
  } else {
    stage4Spinner.succeed('Stage 4 complete\n');
  }

  // Save answers file
  let answersPath = null;
  if (answersData) {
    try {
      answersPath = await saveAnswers(slug, answersData, date);
    } catch (err) {
      console.error(chalk.dim(`  ⚠  Answers save failed: ${err.message}`));
    }
  }

  // Save cover letter DOCX + PDF
  let clDocxPath = null;
  let clPdfPath = null;
  if (clData) {
    try {
      const clSaved = await saveCoverLetter(slug, clData, date, resumeData?.name);
      clDocxPath = clSaved.docx;
      clPdfPath = clSaved.pdf;
    } catch (err) {
      console.error(chalk.dim(`  ⚠  Cover letter save failed: ${err.message}`));
    }
  }

  // Render all results
  renderJD(jdData);
  renderScore(fitData);
  renderText('✍️', 'REWRITTEN RESUME BULLETS', resumeOutput);
  renderText('💬', 'LINKEDIN OUTREACH DMs', outreachOutput);
  if (atsAfter) renderAtsComparison(fitData, atsAfter);
  if (clData) renderCoverLetterSummary(clData, clDocxPath, clPdfPath);
  if (answersData) renderAnswersSummary(answersData, answersPath);

  if (docxPath) console.log(`\n  💾  Resume saved → ${docxPath}`);
  if (pdfPath) console.log(`  💾  Resume saved → ${pdfPath}`);

  // Log this run to tracker
  try {
    await logRun({
      role: jdData.role || 'Unknown',
      company_type: jdData.company_type || '',
      experience_range: `${jdData.years_min ?? 0}-${jdData.years_max ?? 0} yrs`,
      salary_band: jdData.salary_band || '',
      overall_before: fitData.overall ?? 0,
      overall_after: atsAfter?.overall ?? 0,
      ats_before: fitData.ats_probability || '',
      ats_after: atsAfter?.ats_probability || '',
      matched_skills_count: fitData.matched_skills?.length ?? 0,
      missing_skills_count: fitData.missing_skills?.length ?? 0,
      still_missing: atsAfter?.still_missing || [],
      resume_file_path: docxPath || '',
      cover_letter_generated: clDocxPath !== null,
      jd_snippet: jdText,
    });
  } catch (err) {
    console.error(chalk.dim(`  ⚠  Tracker write failed: ${err.message}`));
  }

  console.log('\n  ✅  All done! Good luck with your application.\n');
  await printStats();
}

async function runUpdateFlow() {
  const rows = await readTracker();
  if (!rows.length) {
    console.log('\n  No applications tracked yet. Run the pipeline first.\n');
    return;
  }

  const sorted = [...rows].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const { selectedIdx } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedIdx',
      message: 'Select an application to update:',
      choices: sorted.map((r, i) => ({
        name: `${r.date}  ${chalk.white.bold(r.role || 'Unknown')}  ${chalk.dim(r.company_type || '?')}  [${r.status}]`,
        value: i,
      })),
      pageSize: 10,
    },
  ]);

  const selected = sorted[selectedIdx];

  const { newStatus } = await inquirer.prompt([
    {
      type: 'list',
      name: 'newStatus',
      message: `Set status for "${selected.role}":`,
      choices: ['applied', 'interviewed', 'rejected', 'offer', 'withdrawn'],
      default: selected.status,
    },
  ]);

  const originalIdx = rows.findIndex(r => r.timestamp === selected.timestamp);
  if (originalIdx !== -1) rows[originalIdx].status = newStatus;

  await rewriteTracker(rows);
  console.log(chalk.green(`\n  ✅  Updated "${selected.role}" → ${newStatus}\n`));
}

const args = process.argv.slice(2);

if (args.includes('--stats')) {
  printStats().catch(err => {
    console.error('\n❌  Error:', err.message || err);
    process.exit(1);
  });
} else if (args.includes('--update')) {
  runUpdateFlow().catch(err => {
    console.error('\n❌  Error:', err.message || err);
    process.exit(1);
  });
} else {
  main().catch(err => {
    console.error('\n❌  Unexpected error:', err.message || err);
    process.exit(1);
  });
}
