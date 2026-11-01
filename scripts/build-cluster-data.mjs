// Builds public/data/sanjarica/*.json and public/data/imena/*.json from the
// plain-text sources in content/. Run: node scripts/build-cluster-data.mjs
// The JSON is committed, so the site build does not depend on this script.
//
// Dream format (content/sanjarica/*.txt), one block per page:
//   ## tema | Kategorija | traženja | povezana-tema-1, povezana-tema-2
//   I: uvod   P: psihološko   F: narodna sanjarica   O: osjećaj
//   S: Naslov :: odlomak (\n = novi odlomak)   T: opcija :: tekst   Q: pitanje :: odgovor
//   C:  (prikaži svijeću i memorijal)
//
// Name format (content/imena/*.txt):
//   ## Ime | spol | vokativ | MM-DD sv. Svetac; MM-DD sv. Drugi
//   O: podrijetlo   M: značenje   I: uvod   H: povijest (\n = novi odlomak)   K: osobine
//   V: izvedenica, izvedenica   X: oblik suprotnog spola   J: strani oblici
//   P: poznata osoba (može više redaka)   Q: pitanje :: odgovor
// Stats per name come from content/imena/_stats.json (aggregated from obituaries).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/đ/g, 'd')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const nl = (s) => s.replace(/\\n/g, '\n').trim();
const pair = (s) => {
  const i = s.indexOf('::');
  if (i < 0) throw new Error(`missing "::" in: ${s}`);
  return [nl(s.slice(0, i)), nl(s.slice(i + 2))];
};

function blocks(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  const out = [];
  for (const f of files) {
    let cur = null;
    for (const raw of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') && !line.startsWith('##')) continue;
      if (line.startsWith('## ')) {
        cur = { head: line.slice(3).split('|').map((x) => x.trim()), lines: [], file: f };
        out.push(cur);
      } else if (cur) {
        const m = line.match(/^([A-Z]):\s?(.*)$/);
        if (!m) throw new Error(`${f}: bad line: ${line}`);
        cur.lines.push([m[1], m[2]]);
      }
    }
  }
  return out;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = JSON.stringify(data);
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (old !== text) fs.writeFileSync(file, text);
}

// Keep the original publish/updated date when the content did not change.
function stamp(file, page) {
  if (!fs.existsSync(file)) return { ...page, published: today, updated: today };
  const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { published, updated, ...rest } = prev;
  const same = JSON.stringify(rest) === JSON.stringify(page);
  return { ...page, published: published || today, updated: same ? updated || today : today };
}

function buildDreams() {
  const dir = path.join(ROOT, 'public', 'data', 'sanjarica');
  const pages = [];
  for (const b of blocks(path.join(ROOT, 'content', 'sanjarica'))) {
    const [topic, category, volume, related] = b.head;
    const p = {
      slug: slugify(topic), topic, title: `Sanjati ${topic}`, category,
      intro: null, psych: null, folk: null, feeling: null,
      sections: [], tool: [], faq: [],
      related: (related || '').split(',').map((x) => x.trim()).filter(Boolean),
      memorial_cta: false, search_volume: Number(volume) || null,
    };
    for (const [k, v] of b.lines) {
      if (k === 'I') p.intro = nl(v);
      else if (k === 'P') p.psych = nl(v);
      else if (k === 'F') p.folk = nl(v);
      else if (k === 'O') p.feeling = nl(v);
      else if (k === 'S') { const [h, t] = pair(v); p.sections.push({ h, p: t }); }
      else if (k === 'T') { const [label, text] = pair(v); p.tool.push({ label, text }); }
      else if (k === 'Q') { const [q, a] = pair(v); p.faq.push({ q, a }); }
      else if (k === 'C') p.memorial_cta = true;
      else throw new Error(`${b.file} ${topic}: unknown key ${k}`);
    }
    if (!p.intro || !p.sections.length) throw new Error(`${b.file} ${topic}: missing intro or sections`);
    pages.push(p);
  }
  const seen = new Set();
  const index = [];
  for (const p of pages) {
    if (seen.has(p.slug)) throw new Error(`duplicate dream slug ${p.slug}`);
    seen.add(p.slug);
    const file = path.join(dir, `${p.slug}.json`);
    const page = stamp(file, p);
    writeJson(file, page);
    index.push({ slug: p.slug, topic: p.topic, category: p.category, updated: page.updated });
  }
  index.sort((a, b) => a.topic.localeCompare(b.topic, 'hr'));
  writeJson(path.join(dir, 'index.json'), index);
  return index.length;
}

function buildNames() {
  const dir = path.join(ROOT, 'public', 'data', 'imena');
  const statsFile = path.join(ROOT, 'content', 'imena', '_stats.json');
  const stats = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, 'utf8')) : {};
  const index = [];
  const seen = new Set();
  for (const b of blocks(path.join(ROOT, 'content', 'imena'))) {
    const [name, gender, vocative, days] = b.head;
    const imendani = (days || '')
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const m = x.match(/^(\d{2}-\d{2})\s*(.*)$/);
        if (!m) throw new Error(`${name}: bad imendan "${x}"`);
        return m[2] ? { d: m[1], s: m[2] } : { d: m[1] };
      });
    const p = {
      slug: slugify(name), name, gender: gender === 'ž' || gender === 'žensko' ? 'žensko' : 'muško', vocative: vocative || name,
      origin: null, meaning: null, imendani, intro: null, history: null, character: null,
      variants: [], opposite_form: null, foreign_forms: null, famous: [], faq: [],
      stats: stats[name.toLowerCase()] || null,
    };
    for (const [k, v] of b.lines) {
      if (k === 'O') p.origin = nl(v);
      else if (k === 'M') p.meaning = nl(v);
      else if (k === 'I') p.intro = nl(v);
      else if (k === 'H') p.history = nl(v);
      else if (k === 'K') p.character = nl(v);
      else if (k === 'V') p.variants = v.split(',').map((x) => x.trim()).filter(Boolean);
      else if (k === 'X') p.opposite_form = nl(v);
      else if (k === 'J') p.foreign_forms = nl(v);
      else if (k === 'P') p.famous.push(nl(v));
      else if (k === 'Q') { const [q, a] = pair(v); p.faq.push({ q, a }); }
      else throw new Error(`${b.file} ${name}: unknown key ${k}`);
    }
    if (!p.meaning || !p.intro) throw new Error(`${b.file} ${name}: missing meaning or intro`);
    if (seen.has(p.slug)) throw new Error(`duplicate name slug ${p.slug}`);
    seen.add(p.slug);
    const file = path.join(dir, `${p.slug}.json`);
    // Stats refresh on their own schedule; they do not count as a content change.
    const page = stamp(file, p);
    writeJson(file, page);
    index.push({ slug: p.slug, name: p.name, gender: p.gender, imendani: p.imendani, updated: page.updated });
  }
  index.sort((a, b) => a.name.localeCompare(b.name, 'hr'));
  writeJson(path.join(dir, 'index.json'), index);
  return index.length;
}

const d = buildDreams();
const n = buildNames();
console.log(`cluster data: ${d} dreams, ${n} names`);
