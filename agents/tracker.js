import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import chalk from 'chalk';

const TRACKER_PATH = path.resolve('./outputs/tracker.csv');

const HEADERS = [
  'timestamp',
  'date',
  'role',
  'company_type',
  'experience_range',
  'salary_band',
  'overall_before',
  'overall_after',
  'improvement',
  'ats_before',
  'ats_after',
  'matched_skills_count',
  'missing_skills_count',
  'still_missing_count',
  'still_missing_skills',
  'resume_file_path',
  'cover_letter_generated',
  'jd_first_100_chars',
  'status',
];

export async function logRun({
  role,
  company_type,
  experience_range,
  salary_band,
  overall_before,
  overall_after,
  ats_before,
  ats_after,
  matched_skills_count,
  missing_skills_count,
  still_missing,
  resume_file_path,
  cover_letter_generated = false,
  jd_snippet,
}) {
  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  const now = new Date();
  const improvement = Math.round(((overall_after ?? 0) - (overall_before ?? 0)) * 100) / 100;
  const stillMissingArr = Array.isArray(still_missing) ? still_missing : [];

  const row = [
    now.toISOString(),
    now.toISOString().slice(0, 10),
    role || '',
    company_type || '',
    experience_range || '',
    salary_band || '',
    overall_before ?? 0,
    overall_after ?? 0,
    improvement,
    ats_before || '',
    ats_after || '',
    matched_skills_count ?? 0,
    missing_skills_count ?? 0,
    stillMissingArr.length,
    stillMissingArr.join('|'),
    resume_file_path || '',
    cover_letter_generated ? 'true' : 'false',
    (jd_snippet || '').replace(/[\r\n]+/g, ' ').slice(0, 100),
    'applied',
  ];

  const UNPARSE_OPTS = { newline: '\n' };
  const fileExists = existsSync(TRACKER_PATH);

  if (!fileExists) {
    const csv = Papa.unparse([HEADERS, row], UNPARSE_OPTS);
    await fs.writeFile(TRACKER_PATH, csv + '\n', 'utf-8');
    return;
  }

  // File exists — check if schema matches current HEADERS and migrate if needed
  const existingRaw = await fs.readFile(TRACKER_PATH, 'utf-8');
  const normalized = existingRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const { data: rawRows } = Papa.parse(normalized, { header: false, skipEmptyLines: true });
  const [existingHeaders = [], ...dataRows] = rawRows;

  if (existingHeaders.join(',') !== HEADERS.join(',')) {
    // Schema changed — remap existing rows to new column order, fill new columns with ''
    const oldIdx = Object.fromEntries(existingHeaders.map((h, i) => [h, i]));
    const migrated = dataRows.map(r => HEADERS.map(h => r[oldIdx[h]] ?? ''));
    const csv = Papa.unparse([HEADERS, ...migrated, row], UNPARSE_OPTS);
    await fs.writeFile(TRACKER_PATH, csv + '\n', 'utf-8');
  } else {
    const newRow = Papa.unparse([row], UNPARSE_OPTS);
    await fs.appendFile(TRACKER_PATH, newRow + '\n', 'utf-8');
  }
}

export async function readTracker() {
  if (!existsSync(TRACKER_PATH)) return [];
  const content = await fs.readFile(TRACKER_PATH, 'utf-8');
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const result = Papa.parse(normalized, { header: true, skipEmptyLines: true });
  return result.data;
}

export async function rewriteTracker(rows) {
  const csv = Papa.unparse({ fields: HEADERS, data: rows }, { newline: '\n' });
  await fs.writeFile(TRACKER_PATH, csv + '\n', 'utf-8');
}

export async function printStats() {
  const rows = await readTracker();
  if (!rows.length) return;

  console.log('\n' + chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('  📋  PIPELINE HISTORY'));
  console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  // Total applications
  console.log(`  ${chalk.white('Total applications:    ')} ${chalk.white.bold(rows.length)}`);

  // Avg improvement
  const improvements = rows.map(r => parseFloat(r.improvement) || 0);
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
  const improvSign = avgImprovement >= 0 ? '+' : '';
  const improvColor = avgImprovement > 0 ? chalk.green : avgImprovement < 0 ? chalk.red : chalk.yellow;
  console.log(`  ${chalk.white('Avg score improvement: ')} ${improvColor.bold(`${improvSign}${avgImprovement.toFixed(1)}`)}`);

  // Best scoring role
  const best = rows.reduce((a, b) =>
    (parseFloat(b.overall_after) || 0) > (parseFloat(a.overall_after) || 0) ? b : a
  );
  const bestScore = parseFloat(best.overall_after) || 0;
  console.log(`  ${chalk.white('Best scoring role:     ')} ${chalk.green.bold(best.role)} ${chalk.dim(`(${bestScore}/10)`)}`);

  // ATS distribution
  const atsCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of rows) {
    const p = (r.ats_after || '').toUpperCase();
    if (p in atsCounts) atsCounts[p]++;
  }
  const atsLine = [
    chalk.green(`${atsCounts.HIGH} HIGH`),
    chalk.yellow(`${atsCounts.MEDIUM} MEDIUM`),
    chalk.red(`${atsCounts.LOW} LOW`),
  ].join(chalk.dim(' · '));
  console.log(`  ${chalk.white('ATS distribution:      ')} ${atsLine}`);

  // Top missing skills
  const skillFreq = {};
  for (const r of rows) {
    if (!r.still_missing_skills) continue;
    const skills = r.still_missing_skills.split('|').map(s => s.trim()).filter(Boolean);
    for (const skill of skills) {
      skillFreq[skill] = (skillFreq[skill] || 0) + 1;
    }
  }
  const topSkills = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topSkills.length) {
    console.log(`\n  ${chalk.white('Top missing skills across all runs:')}`);
    for (const [skill, count] of topSkills) {
      const roleWord = count === 1 ? 'role' : 'roles';
      console.log(`    ${chalk.dim('·')} ${chalk.yellow(skill)} ${chalk.dim(`(${count} ${roleWord})`)}`);
    }
  }

  console.log('');
}
