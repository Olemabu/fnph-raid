/* Shared, versioned study-pack contract. Also bundled into FNPH Raid; no network or secrets. */
(function(root, factory) {
  root.StudyKit = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const text = (s, max = 12000) => {
    if (typeof s !== 'string' || !s.trim() || s.length > max) throw Error('Invalid or oversized study text.');
    return s.trim();
  };
  function validate(p) {
    if (!p || p.format !== 'nebula-study-pack' || p.version !== 1) throw Error('Choose a Nebula study pack (version 1).');
    const list = (a, min, max, fn) => {
      if (!Array.isArray(a) || a.length < min || a.length > max) throw Error('Invalid study pack list.');
      return a.map(fn);
    };
    return {
      format: p.format, version: 1, title: text(p.title, 200), question: text(p.question),
      modelAnswer: text(p.modelAnswer, 20000), role: text(p.role, 4000),
      checklist: list(p.checklist, 2, 40, x => text(x, 800)),
      critical: list(p.critical, 0, 10, x => text(x, 800)),
      sources: list(p.sources, 1, 30, s => {
        const url = text(s.url, 1000);
        if (!/^https:\/\//.test(url)) throw Error('Source must use HTTPS.');
        return { title: text(s.title, 200), url };
      }),
      mcqs: list(p.mcqs, 1, 30, q => {
        const options = list(q.options, 4, 5, x => text(x, 1000));
        if (new Set(options).size !== options.length || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) throw Error('Invalid MCQ answer/options.');
        return { q: text(q.q, 2000), options, answer: q.answer, explain: text(q.explain, 4000) };
      }),
      status: p.status === 'reviewed' ? 'reviewed' : 'draft',
    };
  }
  const clean = s => s.replace(/[\r\n|]/g, ' ').replace(/ = /g, ' equals ').replace(/ :: /g, ': ').replace(/ ~~ /g, ' ').trim();
  function deck(input) {
    const p = validate(input);
    return ['## Imported study | ' + clean(p.title), '### ' + clean(p.title),
      '> ' + clean(p.question), '> ' + clean(p.modelAnswer),
      ...p.sources.map(s => '> Source: ' + clean(s.title) + ' ' + s.url),
      ...p.mcqs.flatMap(q => ['Q: ' + clean(q.q) + ' = ' + [q.options[q.answer], ...q.options.filter((_, i) => i !== q.answer)].map(clean).join(' | '), '> ' + clean(q.explain)]),
      'S: Examiner checklist = ' + p.checklist.map(clean).join(' | '),
      '> Critical: ' + p.critical.map(clean).join('; ')].join('\n');
  }
  function segments(s, max = 500) {
    const words = String(s).trim().split(/\s+/), out = []; let part = '';
    for (const word of words) {
      if (part && part.length + word.length + 1 > max) { out.push(part); part = ''; }
      if (word.length > max) { if (part) { out.push(part); part = ''; } for (let i = 0; i < word.length; i += max) out.push(word.slice(i, i + max)); }
      else part += (part ? ' ' : '') + word;
    }
    if (part) out.push(part); return out;
  }
  function terms(q) {
    const stop = new Set('a an the is of to with who and in on for discuss proposed management plan presented persistent about commence university mother year old adolescent'.split(' '));
    return [...new Set(String(q).toLowerCase().replace(/bed[ -]?wetting/g, 'enuresis').match(/[\p{L}][\p{L}\p{N}-]*/gu) || [])].filter(w => w.length > 2 && !stop.has(w)).slice(0, 16);
  }
  function rank(items, query) {
    const words = terms(query); if (!words.length) return [];
    return items.map(x => ({ item: x, score: words.reduce((n, w) => n + ((x.head + ' ' + x.text).toLowerCase().includes(w) ? 1 : 0), 0) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
  }
  return { validate, deck, segments, terms, rank };
});
