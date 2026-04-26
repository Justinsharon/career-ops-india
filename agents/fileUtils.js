import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

export async function readCVFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const absPath = path.resolve(filePath);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  if (ext === '.txt') {
    return await fs.readFile(absPath, 'utf-8');
  }

  if (ext === '.pdf') {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const buffer = await fs.readFile(absPath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ path: absPath });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}. Use .pdf, .docx, or .txt`);
}

const FONT = 'Times New Roman';
const WIN_FONT_REGULAR = 'C:/Windows/Fonts/times.ttf';
const WIN_FONT_BOLD = 'C:/Windows/Fonts/timesbd.ttf';

// dxa = twentieths-of-a-point (OOXML spacing unit)
const pt = (n) => n * 20;
// half-points for TextRun.size
const hp = (n) => n * 2;
// twips for indent (1 inch = 1440 twips)
const twip = (inches) => Math.round(inches * 1440);

function buildDocxChildren(data, docxImport) {
  const {
    Paragraph, TextRun, AlignmentType, BorderStyle, LineRuleType,
  } = docxImport;

  const LINE_SPACING = { line: 276, lineRule: LineRuleType.AUTO }; // 1.15

  const sectionHeading = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: hp(12), font: FONT })],
    alignment: AlignmentType.LEFT,
    spacing: { before: pt(12), after: pt(4), ...LINE_SPACING },
    border: {
      bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
  });

  const bullet = (text) => new Paragraph({
    children: [new TextRun({ text: `\u2022 ${text}`, size: hp(11), font: FONT })],
    alignment: AlignmentType.LEFT,
    indent: { left: twip(0.25) },
    spacing: { after: pt(3), ...LINE_SPACING },
  });

  const body = (text, opts = {}) => new Paragraph({
    children: [new TextRun({ text, size: hp(11), font: FONT, ...opts })],
    alignment: AlignmentType.LEFT,
    spacing: { after: pt(4), ...LINE_SPACING },
  });

  const children = [];

  // 1. Name
  if (data.name) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.name, bold: true, size: hp(16), font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(4), ...LINE_SPACING },
    }));
  }

  // 2. Contact line
  if (data.contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.contact, size: hp(10), font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(6), ...LINE_SPACING },
    }));
  }

  // 3. Professional Summary
  if (data.summary) {
    children.push(sectionHeading('PROFESSIONAL SUMMARY'));
    children.push(body(data.summary));
  }

  // 4. Technical Skills
  if (data.skills?.length) {
    children.push(sectionHeading('TECHNICAL SKILLS'));
    for (const group of data.skills) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${group.category}: `, bold: true, size: hp(11), font: FONT }),
          new TextRun({ text: group.items.join(', '), size: hp(11), font: FONT }),
        ],
        spacing: { after: pt(3), ...LINE_SPACING },
      }));
    }
  }

  // 5. Work Experience
  if (data.experience?.length) {
    children.push(sectionHeading('WORK EXPERIENCE'));
    for (const exp of data.experience) {
      const meta = [exp.role, exp.dates, exp.location].filter(Boolean).join(' | ');
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.company, bold: true, size: hp(11), font: FONT }),
          ...(meta ? [new TextRun({ text: `  |  ${meta}`, size: hp(11), font: FONT })] : []),
        ],
        spacing: { before: pt(6), after: pt(3), ...LINE_SPACING },
      }));
      for (const b of exp.bullets || []) children.push(bullet(b));
    }
  }

  // 6. Projects & Ventures
  if (data.projects?.length) {
    children.push(sectionHeading('PROJECTS & VENTURES'));
    for (const proj of data.projects) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: true, size: hp(11), font: FONT }),
          ...(proj.tech ? [new TextRun({ text: `  |  ${proj.tech}`, size: hp(11), font: FONT })] : []),
        ],
        spacing: { before: pt(6), after: pt(3), ...LINE_SPACING },
      }));
      for (const b of proj.bullets || []) children.push(bullet(b));
    }
  }

  // 7. Education
  if (data.education?.length) {
    children.push(sectionHeading('EDUCATION'));
    for (const edu of data.education) {
      const detail = [edu.year, edu.cgpa ? `CGPA: ${edu.cgpa}` : null].filter(Boolean).join('  |  ');
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.degree, bold: true, size: hp(11), font: FONT }),
          new TextRun({ text: `  |  ${edu.institution}`, size: hp(11), font: FONT }),
          ...(detail ? [new TextRun({ text: `  |  ${detail}`, size: hp(11), font: FONT })] : []),
        ],
        spacing: { before: pt(6), after: pt(3), ...LINE_SPACING },
      }));
    }
  }

  // 8. Certifications & Badges
  if (data.certifications?.length) {
    children.push(sectionHeading('CERTIFICATIONS & BADGES'));
    for (const cert of data.certifications) children.push(bullet(cert));
  }

  // Notice Period
  if (data.notice_period) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Notice Period: ${data.notice_period}`, size: hp(11), font: FONT })],
      spacing: { before: pt(12), after: pt(4), ...LINE_SPACING },
    }));
  }

  return children;
}

export async function saveDocx(slug, resumeData, date) {
  const docxImport = await import('docx');
  const { Document, Packer, convertInchesToTwip } = docxImport;

  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const MARGIN = convertInchesToTwip(1);
  const children = buildDocxChildren(resumeData, docxImport);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.join(outputDir, `resume-${slug}-${date}.docx`);
  await fs.writeFile(docxPath, buffer);

  // PDF generation
  let pdfPath = null;
  try {
    pdfPath = await savePdf(slug, resumeData, date, outputDir);
  } catch (err) {
    // PDF is best-effort; DOCX is the primary output
    process.stderr.write(`  ⚠  PDF generation skipped: ${err.message}\n`);
  }

  return { docx: docxPath, pdf: pdfPath };
}

async function savePdf(slug, data, date, outputDir) {
  const { default: PDFDocument } = await import('pdfkit');

  const hasFonts = existsSync(WIN_FONT_REGULAR) && existsSync(WIN_FONT_BOLD);
  const MARGIN = 72; // 1 inch in points
  const PAGE_WIDTH = 595.28; // A4
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const LINE_GAP = 1.65; // 11pt * 1.15 - 11 ≈ 1.65pt gap for 1.15 spacing

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  if (hasFonts) {
    doc.registerFont('TNR', WIN_FONT_REGULAR);
    doc.registerFont('TNR-Bold', WIN_FONT_BOLD);
  } else {
    doc.registerFont('TNR', 'Helvetica');
    doc.registerFont('TNR-Bold', 'Helvetica-Bold');
  }

  const drawSectionHeading = (text) => {
    doc.moveDown(0.6);
    doc.font('TNR-Bold').fontSize(12).text(text, { lineGap: 1.8 });
    const y = doc.y + 2;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.5).stroke();
    doc.moveDown(0.25);
  };

  const drawBullet = (text) => {
    doc.font('TNR').fontSize(11)
      .text(`\u2022  ${text}`, { indent: 14, lineGap: LINE_GAP });
  };

  // 1. Name
  if (data.name) {
    doc.font('TNR-Bold').fontSize(16).text(data.name, { align: 'center', lineGap: 2.4 });
  }

  // 2. Contact
  if (data.contact) {
    doc.font('TNR').fontSize(10).text(data.contact, { align: 'center', lineGap: 1.5 });
  }

  // 3. Summary
  if (data.summary) {
    drawSectionHeading('PROFESSIONAL SUMMARY');
    doc.font('TNR').fontSize(11).text(data.summary, { align: 'left', lineGap: LINE_GAP });
  }

  // 4. Skills
  if (data.skills?.length) {
    drawSectionHeading('TECHNICAL SKILLS');
    for (const group of data.skills) {
      doc.font('TNR-Bold').fontSize(11).text(`${group.category}: `, { continued: true, lineGap: LINE_GAP });
      doc.font('TNR').fontSize(11).text(group.items.join(', '), { lineGap: LINE_GAP });
    }
  }

  // 5. Experience
  if (data.experience?.length) {
    drawSectionHeading('WORK EXPERIENCE');
    for (const exp of data.experience) {
      doc.moveDown(0.3);
      const meta = [exp.role, exp.dates, exp.location].filter(Boolean).join('  |  ');
      doc.font('TNR-Bold').fontSize(11).text(exp.company, { continued: !!meta, lineGap: LINE_GAP });
      if (meta) doc.font('TNR').fontSize(11).text(`  |  ${meta}`, { lineGap: LINE_GAP });
      for (const b of exp.bullets || []) drawBullet(b);
    }
  }

  // 6. Projects
  if (data.projects?.length) {
    drawSectionHeading('PROJECTS & VENTURES');
    for (const proj of data.projects) {
      doc.moveDown(0.3);
      doc.font('TNR-Bold').fontSize(11).text(proj.name, { continued: !!proj.tech, lineGap: LINE_GAP });
      if (proj.tech) doc.font('TNR').fontSize(11).text(`  |  ${proj.tech}`, { lineGap: LINE_GAP });
      for (const b of proj.bullets || []) drawBullet(b);
    }
  }

  // 7. Education
  if (data.education?.length) {
    drawSectionHeading('EDUCATION');
    for (const edu of data.education) {
      doc.moveDown(0.3);
      const detail = [edu.year, edu.cgpa ? `CGPA: ${edu.cgpa}` : null].filter(Boolean).join('  |  ');
      doc.font('TNR-Bold').fontSize(11).text(edu.degree, { continued: true, lineGap: LINE_GAP });
      doc.font('TNR').fontSize(11).text(`  |  ${edu.institution}${detail ? `  |  ${detail}` : ''}`, { lineGap: LINE_GAP });
    }
  }

  // 8. Certifications
  if (data.certifications?.length) {
    drawSectionHeading('CERTIFICATIONS & BADGES');
    for (const cert of data.certifications) drawBullet(cert);
  }

  // Notice Period
  if (data.notice_period) {
    doc.moveDown(0.6);
    doc.font('TNR').fontSize(11).text(`Notice Period: ${data.notice_period}`, { lineGap: LINE_GAP });
  }

  doc.end();

  await new Promise((resolve) => doc.on('end', resolve));

  const pdfPath = path.join(outputDir, `resume-${slug}-${date}.pdf`);
  await fs.writeFile(pdfPath, Buffer.concat(chunks));
  return pdfPath;
}

function buildCoverLetterChildren(clData, candidateName, docxImport) {
  const { Paragraph, TextRun, AlignmentType, LineRuleType } = docxImport;
  const LS = { line: 276, lineRule: LineRuleType.AUTO };

  const para = (text, fontSize = 11, bold = false) => new Paragraph({
    children: [new TextRun({ text: text || '', size: hp(fontSize), font: FONT, bold })],
    alignment: AlignmentType.LEFT,
    spacing: { after: 0, ...LS },
  });

  const blank = () => new Paragraph({ children: [], spacing: { after: 0, ...LS } });

  const children = [];

  children.push(para('Dear Hiring Manager,'));
  children.push(blank());

  for (const text of [clData.opening_paragraph, clData.body_paragraph_1, clData.body_paragraph_2, clData.closing_paragraph]) {
    if (text) {
      children.push(para(text));
      children.push(blank());
    }
  }

  children.push(para('Best regards,'));
  children.push(para(candidateName || '', 11, true));
  return children;
}

async function saveCoverLetterPdf(slug, clData, date, outputDir, candidateName = '') {
  const { default: PDFDocument } = await import('pdfkit');

  const hasFonts = existsSync(WIN_FONT_REGULAR) && existsSync(WIN_FONT_BOLD);
  const MARGIN = 72;
  const LINE_GAP = 1.65;

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  doc.registerFont('TNR', hasFonts ? WIN_FONT_REGULAR : 'Helvetica');
  doc.registerFont('TNR-Bold', hasFonts ? WIN_FONT_BOLD : 'Helvetica-Bold');

  doc.font('TNR').fontSize(11).text('Dear Hiring Manager,', { lineGap: LINE_GAP });
  doc.moveDown(1);

  for (const text of [clData.opening_paragraph, clData.body_paragraph_1, clData.body_paragraph_2, clData.closing_paragraph]) {
    if (text) {
      doc.font('TNR').fontSize(11).text(text, { align: 'left', lineGap: LINE_GAP });
      doc.moveDown(1);
    }
  }

  doc.font('TNR').fontSize(11).text('Best regards,', { lineGap: LINE_GAP });
  doc.font('TNR-Bold').fontSize(11).text(candidateName || '', { lineGap: LINE_GAP });

  doc.end();
  await new Promise(resolve => doc.on('end', resolve));

  const pdfPath = path.join(outputDir, `cover-letter-${slug}-${date}.pdf`);
  await fs.writeFile(pdfPath, Buffer.concat(chunks));
  return pdfPath;
}

export async function saveCoverLetter(slug, clData, date, candidateName = '') {
  const docxImport = await import('docx');
  const { Document, Packer, convertInchesToTwip } = docxImport;

  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const MARGIN = convertInchesToTwip(1);
  const children = buildCoverLetterChildren(clData, candidateName, docxImport);

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.join(outputDir, `cover-letter-${slug}-${date}.docx`);
  await fs.writeFile(docxPath, buffer);

  let pdfPath = null;
  try {
    pdfPath = await saveCoverLetterPdf(slug, clData, date, outputDir, candidateName);
  } catch (err) {
    process.stderr.write(`  ⚠  Cover letter PDF skipped: ${err.message}\n`);
  }

  return { docx: docxPath, pdf: pdfPath };
}

// ─── DOCX In-Place Editor ────────────────────────────────────────────────────

function parseRewritePairs(output) {
  const pairs = [];
  let current = {};
  for (const line of output.split('\n')) {
    const orig = line.match(/^\*\*\[Original\]:\*\*\s*(.+)/);
    const rewrite = line.match(/^\*\*\[Rewritten\]:\*\*\s*(.+)/);
    if (orig) current.original = orig[1].trim();
    else if (rewrite && current.original) {
      pairs.push({ original: current.original, rewritten: rewrite[1].trim() });
      current = {};
    }
  }
  return pairs;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceBulletText(paragraphXml, newText) {
  let isFirst = true;
  return paragraphXml.replace(/<w:t([^>]*)>[\s\S]*?<\/w:t>/g, () => {
    if (isFirst) {
      isFirst = false;
      return `<w:t xml:space="preserve">${escapeXml(newText)}</w:t>`;
    }
    return '<w:t></w:t>';
  });
}

// Returns bullet paragraph metadata from a pre-split segments array.
function extractBullets(segments) {
  const bullets = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.startsWith('<w:p') || !seg.includes('<w:numPr>')) continue;
    const textParts = [...seg.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
    const text = textParts.join('').trim();
    if (text) bullets.push({ segIdx: i, originalText: text });
  }
  return bullets;
}

// Pairs resume_writer (original → rewritten) pairs with extracted DOCX bullets.
function matchRewrittenBullets(bullets, pairs) {
  const normalize = t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  let matched = 0;
  const warnings = [];
  for (const pair of pairs) {
    const key = normalize(pair.original).slice(0, 25);
    const bullet = bullets.find(b => !b.matched && normalize(b.originalText).startsWith(key.slice(0, 18)));
    if (bullet) {
      bullet.matched = true;
      bullet.rewrittenText = pair.rewritten;
      matched++;
    } else {
      warnings.push(`No DOCX match for: "${pair.original.slice(0, 55)}"`);
    }
  }
  return { matched, warnings };
}

export async function saveDocxInPlace(originalDocxPath, slug, resumeWriterOutput, date, resumeData) {
  const { default: JSZip } = await import('jszip');

  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const rewritePairs = parseRewritePairs(resumeWriterOutput);

  const buffer = await fs.readFile(originalDocxPath);
  const zip = await JSZip.loadAsync(buffer);
  const xmlContent = await zip.file('word/document.xml').async('string');

  // Split XML preserving paragraph nodes as discrete segments
  const PARA_RE = /(<w:p[ >][\s\S]*?<\/w:p>)/g;
  const segments = xmlContent.split(PARA_RE);

  const bullets = extractBullets(segments);
  const { matched, warnings } = matchRewrittenBullets(bullets, rewritePairs);
  if (warnings.length) warnings.forEach(w => process.stderr.write(`  ⚠  ${w}\n`));

  for (const bullet of bullets) {
    if (bullet.rewrittenText) {
      segments[bullet.segIdx] = replaceBulletText(segments[bullet.segIdx], bullet.rewrittenText);
    }
  }

  zip.file('word/document.xml', segments.join(''));
  const docxBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const docxPath = path.join(outputDir, `resume-${slug}-${date}.docx`);
  await fs.writeFile(docxPath, docxBuffer);

  // PDF is rendered from resume_final JSON (pdfkit path) since we can't convert DOCX to PDF in Node
  let pdfPath = null;
  if (resumeData) {
    try {
      pdfPath = await savePdf(slug, resumeData, date, outputDir);
    } catch (err) {
      process.stderr.write(`  ⚠  PDF generation skipped: ${err.message}\n`);
    }
  }

  return { docx: docxPath, pdf: pdfPath, matchedCount: matched, totalPairs: rewritePairs.length };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function saveAnswers(slug, answersData, date) {
  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const prose = [
    ['Tell Me About Yourself', answersData.tell_me_about_yourself],
    ['Why This Role?', answersData.why_this_role],
    ['Why Should We Hire You?', answersData.why_hire_you],
    ['Biggest Achievement (STAR)', answersData.biggest_achievement],
    ['Why Are You Leaving Your Current Role?', answersData.why_leaving_current_role],
    ['Notice Period', answersData.notice_period_response],
    ['Salary Expectations', answersData.salary_expectation_response],
  ];

  const lists = [
    ['Strengths', answersData.strengths],
    ['Weaknesses', answersData.weaknesses],
    ['Questions to Ask the Interviewer', answersData.questions_to_ask_interviewer],
  ];

  let md = `# Interview Prep Answers\nGenerated: ${date}\n\n---\n\n`;
  for (const [title, content] of prose) {
    md += `## ${title}\n\n${content || ''}\n\n`;
  }
  for (const [title, items] of lists) {
    md += `## ${title}\n\n`;
    if (Array.isArray(items)) {
      for (const item of items) md += `- ${item}\n`;
    }
    md += '\n';
  }

  const filePath = path.join(outputDir, `answers-${slug}-${date}.md`);
  await fs.writeFile(filePath, md.trim() + '\n', 'utf-8');
  return filePath;
}

export async function saveOutput(role, content) {
  const outputDir = path.resolve('./outputs');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${timestamp}_${role.replace(/\s+/g, '_')}.md`;
  const filepath = path.join(outputDir, filename);

  await fs.writeFile(filepath, content, 'utf-8');
  return filepath;
}
