import chalk from 'chalk';

export function banner() {
  console.log('\n' + chalk.bgBlue.white.bold('                                          '));
  console.log(chalk.bgBlue.white.bold('   🚀  Career-Ops India v2                '));
  console.log(chalk.bgBlue.white.bold('   AI-Powered Job Application Pipeline    '));
  console.log(chalk.bgBlue.white.bold('                                          ') + '\n');
}

export function renderScore(scoreData) {
  const { ats_score, skill_overlap, experience_fit, recruiter_likelihood, overall, ats_probability, matched_skills, missing_skills, verdict } = scoreData;

  console.log('\n' + chalk.yellow.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.yellow.bold('  📊  FIT EVALUATION'));
  console.log(chalk.yellow.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const dimensions = [
    ['ATS Score', ats_score],
    ['Skill Overlap', skill_overlap],
    ['Experience Fit', experience_fit],
    ['Recruiter Likelihood', recruiter_likelihood],
  ];

  for (const [label, score] of dimensions) {
    const s = score ?? 0;
    const bar = buildBar(s, 10);
    const color = s >= 7 ? chalk.green : s >= 5 ? chalk.yellow : chalk.red;
    console.log(`  ${chalk.white(label.padEnd(22))} ${color(bar)} ${color.bold(s + '/10')}`);
  }

  const overallVal = overall ?? 0;
  const overallPct = Math.round(overallVal * 10);
  const overallColor = overallPct >= 70 ? chalk.green : overallPct >= 50 ? chalk.yellow : chalk.red;
  console.log('\n' + chalk.white('  Overall Fit: ') + overallColor.bold(`${overallVal}/10  (${overallPct}%)`));

  if (ats_probability) {
    const probColor = ats_probability === 'HIGH' ? chalk.green : ats_probability === 'MEDIUM' ? chalk.yellow : chalk.red;
    console.log(chalk.white('  ATS Pass:    ') + probColor.bold(ats_probability));
  }

  if (matched_skills?.length) {
    console.log('\n' + chalk.green.bold('  Matched Skills:'));
    console.log('  ' + matched_skills.map(s => chalk.bgGreen.black(' ' + s + ' ')).join(' '));
  }

  if (missing_skills?.length) {
    console.log('\n' + chalk.red.bold('  Missing Skills:'));
    missing_skills.forEach(s => console.log(chalk.red('  ✗ ' + s)));
  }

  if (verdict) {
    console.log('\n' + chalk.cyan.bold('  Verdict:'));
    verdict.split('\n').forEach(line => line.trim() && console.log(chalk.white('  ' + line.trim())));
  }

  console.log('');
}

export function renderJD(jd) {
  console.log('\n' + chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  🧹  CLEANED JOB DESCRIPTION'));
  console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  ${chalk.white.bold('Role:')}         ${chalk.cyan(jd.role || 'N/A')}`);
  console.log(`  ${chalk.white.bold('Company Type:')} ${chalk.cyan(jd.company_type || 'N/A')}`);

  const yoe = (jd.years_min != null && jd.years_max != null)
    ? `${jd.years_min}–${jd.years_max} yrs`
    : 'N/A';
  console.log(`  ${chalk.white.bold('Experience:')}   ${chalk.cyan(yoe)}`);

  if (jd.salary_band) {
    console.log(`  ${chalk.white.bold('Salary:')}       ${chalk.cyan(jd.salary_band)}`);
  }

  if (jd.real_skills?.length) {
    console.log('\n  ' + chalk.white.bold('Real Skills Required:'));
    console.log('  ' + jd.real_skills.map(t => chalk.bgGreen.black(' ' + t + ' ')).join(' '));
  }

  if (jd.must_have?.length) {
    console.log('\n  ' + chalk.white.bold('Must Have:'));
    jd.must_have.forEach(r => console.log(chalk.green('  ✓ ' + r)));
  }

  if (jd.good_to_have?.length) {
    console.log('\n  ' + chalk.white.bold('Good to Have:'));
    jd.good_to_have.forEach(r => console.log(chalk.yellow('  ◦ ' + r)));
  }

  if (jd.tech_stack?.length) {
    console.log('\n  ' + chalk.white.bold('Tech Stack:'));
    console.log('  ' + jd.tech_stack.map(t => chalk.bgGreen.black(' ' + t + ' ')).join(' '));
  }

  if (jd.hidden_keywords?.length) {
    console.log('\n  ' + chalk.white.bold('Hidden ATS Keywords:'));
    console.log('  ' + jd.hidden_keywords.map(k => chalk.bgYellow.black(' ' + k + ' ')).join(' '));
  }

  if (jd.fluff_removed?.length) {
    console.log('\n  ' + chalk.dim('  Fluff stripped: ' + jd.fluff_removed.join(', ')));
  }

  if (jd.red_flags?.length) {
    console.log('\n  ' + chalk.red.bold('Red Flags:'));
    jd.red_flags.forEach(f => console.log(chalk.red('  ⚠ ' + f)));
  }

  if (jd.summary) {
    console.log('\n  ' + chalk.white.bold('Summary:'));
    console.log(chalk.dim('  ' + jd.summary));
  }

  console.log('');
}

export function renderText(emoji, title, text) {
  console.log('\n' + chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold(`  ${emoji}  ${title}`));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(text);
  console.log('');
}

export function renderAtsComparison(before, after) {
  console.log('\n' + chalk.magenta.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.magenta.bold('  📈  ATS SCORE IMPROVEMENT'));
  console.log(chalk.magenta.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(
    '  ' + chalk.white.bold('BEFORE OPTIMIZATION'.padEnd(26)) +
    chalk.white.bold('AFTER OPTIMIZATION')
  );
  console.log('');

  const fmtScore = (n, denom) => `${(n ?? 0) % 1 === 0 ? (n ?? 0) : (n ?? 0).toFixed(1)}/${denom}`;
  const fmtDelta = (b, a) => {
    const d = Math.round(((a ?? 0) - (b ?? 0)) * 10) / 10;
    if (d > 0) return chalk.green(`(+${d % 1 === 0 ? d : d.toFixed(1)})`);
    if (d < 0) return chalk.red(`(${d % 1 === 0 ? d : d.toFixed(1)})`);
    return chalk.yellow('(=)');
  };
  const afterColor = (b, a) => {
    const d = (a ?? 0) - (b ?? 0);
    return d > 0 ? chalk.green : d < 0 ? chalk.red : chalk.yellow;
  };

  const rows = [
    ['Overall:', before.overall,             after.overall,             10],
    ['ATS:',     before.ats_score,            after.ats_score,           10],
    ['Skills:',  before.skill_overlap,        after.skill_overlap,       10],
    ['Exp Fit:', before.experience_fit,       after.experience_fit,      10],
    ['Recruiter:', before.recruiter_likelihood, after.recruiter_likelihood, 10],
  ];

  for (const [label, b, a, denom] of rows) {
    const bStr = fmtScore(b, denom);
    const aStr = fmtScore(a, denom);
    const color = afterColor(b, a);
    console.log(
      `  ${chalk.white(label.padEnd(12))} ${chalk.dim(bStr.padEnd(10))} ${chalk.dim('→')}   ${color(aStr.padEnd(10))} ${fmtDelta(b, a)}`
    );
  }

  console.log('');

  const probColor = (p) => p === 'HIGH' ? chalk.green : p === 'MEDIUM' ? chalk.yellow : chalk.red;
  const bp = before.ats_probability || 'N/A';
  const ap = after.ats_probability || 'N/A';
  const probChanged = bp !== ap;
  console.log(
    `  ${'ATS Pass:'.padEnd(12)} ${probColor(bp)(bp.padEnd(10))} ${chalk.dim('→')}   ${probColor(ap)(ap)}` +
    (probChanged ? '' : chalk.yellow('  (=)'))
  );

  if (after.still_missing?.length) {
    console.log('\n  ' + chalk.yellow.bold('Still missing: ') + chalk.yellow(after.still_missing.join(', ')));
  }

  console.log('');
}

export function renderCoverLetterSummary(clData, docxPath, pdfPath) {
  console.log('\n' + chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('  ✉️   COVER LETTER GENERATED') + chalk.dim(' (using optimised resume)'));
  console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const wc = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
  const totalWords = wc(clData.opening_paragraph) + wc(clData.body_paragraph_1) +
                     wc(clData.body_paragraph_2) + wc(clData.closing_paragraph);

  const phrases = (clData.body_paragraph_1 || '')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(s => chalk.dim(s.length > 55 ? s.slice(0, 52) + '…' : s));

  console.log(`  ${chalk.green('✓')} Addressed to: ${chalk.white(clData.hiring_manager || 'Hiring Manager')} at ${chalk.white.bold(clData.company_name || '?')}`);
  console.log(`  ${chalk.green('✓')} Role: ${chalk.white(clData.role_title || '?')}`);
  console.log(`  ${chalk.green('✓')} Word count: ~${totalWords} words`);
  if (phrases.length) {
    console.log(`  ${chalk.green('✓')} References rewritten resume bullets:`);
    for (const phrase of phrases) console.log(`      "${phrase}"`);
  }
  if (docxPath) console.log(`\n  💾 Cover letter saved → ${docxPath}`);
  if (pdfPath) console.log(`  💾 Cover letter saved → ${pdfPath}`);
  console.log('');
}

export function renderAnswersSummary(answersData, filePath) {
  console.log('\n' + chalk.white.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white.bold('  🎤  INTERVIEW ANSWERS PREPARED'));
  console.log(chalk.white.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const wc = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
  const strengths = Array.isArray(answersData.strengths) ? answersData.strengths.length : 0;
  const weaknesses = Array.isArray(answersData.weaknesses) ? answersData.weaknesses.length : 0;
  const questions = Array.isArray(answersData.questions_to_ask_interviewer) ? answersData.questions_to_ask_interviewer.length : 0;

  console.log(`  ${chalk.green('✓')} Tell me about yourself  ${chalk.dim(`(${wc(answersData.tell_me_about_yourself)} words)`)}`);
  console.log(`  ${chalk.green('✓')} Why this role`);
  console.log(`  ${chalk.green('✓')} Why should we hire you`);
  console.log(`  ${chalk.green('✓')} Biggest achievement  ${chalk.dim(`(${wc(answersData.biggest_achievement)} words · STAR format)`)}`);
  console.log(`  ${chalk.green('✓')} Notice period + salary expectation`);
  console.log(`  ${chalk.green('✓')} Strengths (${strengths}) and weaknesses (${weaknesses})`);
  console.log(`  ${chalk.green('✓')} Questions to ask interviewer (${questions})`);

  if (filePath) console.log(`\n  💾 Answers saved → ${filePath}`);
  console.log('');
}

export function renderSaved(filePath) {
  console.log(chalk.dim(`  💾 Saved → ${filePath}`));
}

function buildBar(score, max) {
  const filled = Math.round((score / max) * 12);
  return '█'.repeat(filled) + '░'.repeat(12 - filled);
}
