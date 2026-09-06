/* 全站站内搜索：从内存中的 i18n 字典实时构建索引（纯客户端，无需后端）
   覆盖：全部 22 个页面（每条作为 guide 结果）+ 各级独立条目（谜题 / 物品 / 电台 / 成就 / 问题），
   每条结果带分类徽标。搜索按语言切换自动重建。 */
(function () {
  'use strict';

  /* ---------- 页面注册表：i18n 顶层 key → 页面文件名 ---------- */
  var PAGE_BY_KEY = {
    key: 'big-walk-key-cutting.html',
    map: 'big-walk-map.html',
    green: 'big-walk-green-tower.html',
    yellow: 'big-walk-yellow-tower.html',
    blue: 'big-walk-blue-tower.html',
    black: 'big-walk-black-tower.html',
    purple: 'big-walk-purple-puzzles.html',
    purpleTimer: 'big-walk-purple-timer.html',
    purpleGolf: 'big-walk-purple-golf.html',
    purpleLights: 'big-walk-purple-lights.html',
    purpleSpeakers: 'big-walk-purple-speakers.html',
    purpleSymbols: 'big-walk-purple-symbols.html',
    purpleDrawings: 'big-walk-purple-drawings.html',
    purplePlatform: 'big-walk-purple-platforming.html',
    backpacks: 'big-walk-backpacks.html',
    puzzles: 'big-walk-puzzles.html',
    additional: 'big-walk-additional-puzzles.html',
    walkthrough: 'big-walk-walkthrough.html',
    beginners: 'big-walk-beginners-guide.html',
    achievements: 'big-walk-achievements.html',
    '4166': 'big-walk-4166-1899.html',
    faq: 'big-walk-faq.html'
  };

  var FAQ_ITEMS_KEY = 'home.sections.index.items'; // 首页 FAQ 的“常见问题”列表
  var MAX_RESULTS = 8;

  var built = { lang: null, entries: [] };

  function get(v) { return v == null ? '' : String(v); }
  function lower(s) { return get(s).toLowerCase(); }

  function dict(lang) { return (window.I18N && window.I18N[lang]) || {}; }

  function lookup(lang, path) {
    var parts = path.split('.');
    var cur = dict(lang);
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ---------- 从单个页面节点抽取：标题 / 主说明 / 短文案列表 / 可检索全文本 ---------- */
  function pageEntry(d, href) {
    var snippets = [];

    ['title', 'description', 'h1', 'breadcrumb', 'lead'].forEach(function (k) {
      if (get(d[k])) snippets.push(get(d[k]));
    });

    // 列表型字段：prereq（前置条件）、steps（步骤）、pitfalls（“为什么不行”问答）、
    // cutters（切割台）、puzzles（谜题）、reading（延伸阅读）、related（相关）、true（真结局）
    var listKeys = ['prereq', 'steps', 'pitfalls', 'cutters', 'puzzles', 'reading', 'related', 'true'];
    var itemKeys = ['q', 'a', 'heading', 'body', 'name', 'desc', 'label', 'tower', 'loc', 'use', 'where', 'source', 'count', 'coord', 'tag'];
    listKeys.forEach(function (k) {
      var arr = d[k];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (it) {
        if (!it || typeof it !== 'object') { if (get(it)) snippets.push(get(it)); return; }
        itemKeys.forEach(function (ik) { if (get(it[ik])) snippets.push(get(it[ik])); });
      });
    });

    // items.groups：背包 / 电台等分组条目（backpacks 页）
    if (d.items && Array.isArray(d.items.groups)) {
      d.items.groups.forEach(function (g) {
        if (!g || !Array.isArray(g.items)) return;
        g.items.forEach(function (it) {
          if (!it || typeof it !== 'object') return;
          ['name', 'use', 'where', 'tag'].forEach(function (ik) { if (get(it[ik])) snippets.push(get(it[ik])); });
        });
      });
    }

    // 去重、去掉空白
    var seen = {};
    var dedup = [];
    snippets.forEach(function (s) {
      s = s.trim();
      if (s && !seen[s]) { seen[s] = 1; dedup.push(s); }
    });

    return {
      type: 'guide',
      href: href,
      title: get(d.breadcrumb) || get(d.h1) || get(d.title) || href,
      lead: get(d.lead) || get(d.h1) || get(d.title) || '',
      snippets: dedup,
      haystack: dedup.join(' ').toLowerCase()
    };
  }

  function faqEntry(it, href) {
    var q = get(it && it.q);
    var a = get(it && it.a);
    return {
      type: 'question',
      href: href || 'big-walk-faq.html',
      title: q || a,
      lead: a,
      snippets: [q, a].filter(function (s) { return s.trim(); }),
      haystack: lower(q + ' ' + a)
    };
  }

  /* ---------- 独立条目：把各级列表里的每一项建成单独一条可搜结果 ----------
     puzzles / backpacks / radios / achievements / beginners.items 里的条目大多是
     { name, coord, desc, tag, use, where, href?, color? }；FAQ 问答用 faqEntry。 */
  function itemEntry(type, href, o) {
    var name = get(o && (o.name || o.heading || o.title || o.label));
    var text = [];
    var seen = {};
    ['name', 'coord', 'desc', 'tag', 'use', 'where', 'body'].forEach(function (k) {
      var s = get(o && o[k]).trim();
      if (s && !seen[s]) { seen[s] = 1; text.push(s); }
    });
    var lead = get(o && (o.desc || o.use || o.where || o.body)) || text[0] || name;
    if (!text.length && lead) text.push(lead);
    return {
      type: type,
      href: href || '#',
      title: name || href,
      lead: lead || name || '',
      snippets: text,
      haystack: lower(text.join(' '))
    };
  }

  /* 哪些页面的 puzzles 数组要各自拆成谜题条目（其余列表按固定 type 处理） */
  var PUZZLE_PAGES = ['map', 'green', 'yellow', 'blue', 'black', 'purple', 'additional'];

  function buildItemEntries(lang, entries) {
    PUZZLE_PAGES.forEach(function (pk) {
      var d = dict(lang)[pk];
      if (!d || !Array.isArray(d.puzzles)) return;
      d.puzzles.forEach(function (p) {
        // 深链锚点落在谜题所在列表页，因为那里的卡片 id == slug(谜题名)。
        // 子页标题可能与列表名不同（如“9 Speakers”列表名叫“9 Speakers, Can't Talk”），
        // 直接拼子页会让锚点失配；统一走列表页保证锚点一定能对上。
        if (p && get(p.name)) entries.push(itemEntry('puzzle', PAGE_BY_KEY[pk], p));
      });
    });

    var bp = dict(lang).backpacks;
    if (bp && Array.isArray(bp.backpacks)) {
      bp.backpacks.forEach(function (p) { if (p && get(p.name)) entries.push(itemEntry('item', 'big-walk-backpacks.html', p)); });
    }
    if (bp && Array.isArray(bp.radios)) {
      bp.radios.forEach(function (p) { if (p && get(p.name)) entries.push(itemEntry('radio', 'big-walk-backpacks.html', p)); });
    }

    var ac = dict(lang).achievements;
    if (ac && Array.isArray(ac.achievements)) {
      ac.achievements.forEach(function (p) { if (p && get(p.name)) entries.push(itemEntry('achievement', 'big-walk-achievements.html', p)); });
    }

    // 常见问题子页的整页问答（basics / start / main / puzzle / collect / end / tech）——
    // 每一条都单独成为一个“问题”结果，直达 FAQ 页
    var faq = dict(lang).faq;
    if (faq) {
      ['basics', 'start', 'main', 'puzzle', 'collect', 'end', 'tech'].forEach(function (fk) {
        if (!Array.isArray(faq[fk])) return;
        faq[fk].forEach(function (it) {
          if (it && (get(it.q) || get(it.a))) entries.push(faqEntry(it));
        });
      });
    }

    // 新手入门“实用物品速查”里的每一项物品（name / tag / use / where）
    var bgs = dict(lang).beginners;
    if (bgs && bgs.items && Array.isArray(bgs.items.groups)) {
      bgs.items.groups.forEach(function (g) {
        if (!g || !Array.isArray(g.items)) return;
        g.items.forEach(function (it) {
          if (it && get(it.name)) entries.push(itemEntry('item', 'big-walk-beginners-guide.html', it));
        });
      });
    }
  }

  function build(lang) {
    var entries = [];
    var byHref = {};

    Object.keys(PAGE_BY_KEY).forEach(function (k) {
      var d = dict(lang)[k];
      if (!d) return;
      var e = pageEntry(d, PAGE_BY_KEY[k]);
      byHref[e.href] = e;
      entries.push(e);
    });

    // 各级列表里的独立条目（谜题 / 物品 / 电台 / 成就），各自成一条结果
    buildItemEntries(lang, entries);

    // 合并首页速查卡的标题 / 描述 / 坐标 —— 用词更口语（如“音箱”，而页面里是“扬声器”），
    // 同时让按坐标（如 “3670”）也能直接搜到对应塔页。
    var colls = lookup(lang, 'home.collections');
    if (colls && typeof colls === 'object') {
      Object.keys(colls).forEach(function (cid) {
        var arr = colls[cid];
        if (!Array.isArray(arr)) return;
        arr.forEach(function (c) {
          if (!c || !c.href) return;
          var e = byHref[c.href];
          if (!e) return;
          ['name', 'desc', 'meta', 'badge', 'coord', 'icon'].forEach(function (k) {
            if (get(c[k])) e.snippets.push(get(c[k]));
          });
          e.haystack = e.snippets.join(' ').toLowerCase();
        });
      });
    }

    // 首页 FAQ 每条问答单独成一条结果（位置在首页，直达首页对应锚点）
    var faq = lookup(lang, FAQ_ITEMS_KEY);
    if (Array.isArray(faq)) {
      faq.forEach(function (it) { if (it && (get(it.q) || get(it.a))) entries.push(faqEntry(it, 'index.html')); });
    }

    return entries;
  }

  function index() {
    var lang = document.documentElement.getAttribute('lang') === 'zh-CN' ? 'zh' : 'en';
    if (built.lang !== lang) {
      built.lang = lang;
      built.entries = build(lang);
    }
    return built.entries;
  }

  /* ---------- 匹配与排序 ----------
     中文没有空格分词，所以一个“段”（含中文）要按字匹配：
     整段连续出现，或该段所有汉字都命中；拉丁/数字按整段匹配。 */
  function hasCJK(s) { return /[一-鿿]/.test(s); }

  function uniq(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  function analyze(q) {
    var raw = get(q).trim().toLowerCase();
    if (!raw) return null;
    var segments = raw.split(/[\s　]+/).filter(Boolean);         // 按空白/全角空格分段
    var cjkChars = uniq(raw.split('').filter(hasCJK));                 // 纯中文段拆成单字
    return { raw: raw, segments: segments, phrase: segments.join(' '), cjkChars: cjkChars };
  }

  // 段是否命中：拉丁整段连续；中文整段连续，或命中足够多的汉字。
  // 2 字词严格（音箱→音+箱）；≥4 字词放宽到 3/4，容忍同义词缺一个字（如“几个玩家”）。
  function segmentOk(seg, hay) {
    if (hasCJK(seg)) {
      if (hay.indexOf(seg) !== -1) return true;
      var chars = uniq(seg.split('').filter(hasCJK));
      if (!chars.length) return hay.indexOf(seg) !== -1;
      var need = Math.max(1, Math.ceil(chars.length * 0.75));
      var n = chars.filter(function (c) { return hay.indexOf(c) !== -1; }).length;
      return n >= need;
    }
    return hay.indexOf(seg) !== -1;
  }

  // 中文段的相邻二元组（“背包坐标”→ 背包、包坐、坐标）：命中越多越贴切
  function cjkBigrams(seg) {
    var chars = seg.split('').filter(hasCJK);
    var bi = [];
    for (var i = 0; i < chars.length - 1; i++) bi.push(chars[i] + chars[i + 1]);
    return bi;
  }

  function scoreEntry(e, a) {
    var title = lower(e.title);
    var lead = lower(e.lead);
    var hay = e.haystack;
    var s = 0;
    // 整句作为短语命中：分值最高
    if (a.phrase && title.indexOf(a.phrase) !== -1) s += 200;
    else if (a.phrase && lead.indexOf(a.phrase) !== -1) s += 120;
    else if (a.phrase && hay.indexOf(a.phrase) !== -1) s += 60;
    // 每个段各自命中
    a.segments.forEach(function (seg) {
      if (title.indexOf(seg) !== -1) s += 30;
      else if (lead.indexOf(seg) !== -1) s += 15;
      else if (hay.indexOf(seg) !== -1) s += 6;
    });
    // 中文：命中标题里的汉字越多越靠前；连续二元组命中越多越精确
    if (a.cjkChars.length) {
      var inTitle = a.cjkChars.filter(function (c) { return title.indexOf(c) !== -1; }).length;
      s += inTitle * 4;
    }
    var bigrams = [];
    a.segments.forEach(function (seg) { if (hasCJK(seg)) bigrams = bigrams.concat(cjkBigrams(seg)); });
    bigrams.forEach(function (g) {
      if (title.indexOf(g) !== -1) s += 10;
      else if (lead.indexOf(g) !== -1) s += 5;
      else if (hay.indexOf(g) !== -1) s += 2;
    });
    s += a.segments.length;
    return s;
  }

  // 命中时挑一条最贴切的短文案做摘要，避免整段 lead 过长
  function bestSnippet(e, a) {
    if (!e.snippets.length) return e.lead;
    var best = e.lead;
    var bestScore = -1;
    e.snippets.forEach(function (s) {
      var sl = lower(s);
      var score = 0;
      if (a.phrase && sl.indexOf(a.phrase) !== -1) score += 100;
      a.segments.forEach(function (seg) { if (sl.indexOf(seg) !== -1) score += 20; });
      var cc = a.cjkChars.filter(function (c) { return sl.indexOf(c) !== -1; }).length;
      score += cc * 3;
      if (score > bestScore) { bestScore = score; best = s; }
    });
    return best;
  }

  function search(q) {
    var a = analyze(q);
    if (!a || !a.segments.length) return [];
    var entries = index();
    var out = [];
    entries.forEach(function (e) {
      if (!e.haystack) return;
      // 每个段都命中才匹配（“purple speakers” 需同时含 purple 与 speakers；“紫音箱”需含 紫/音/箱）
      var ok = a.segments.every(function (seg) { return segmentOk(seg, e.haystack); });
      if (!ok) return;
      // 非页面级结果拼 #锚点，让点击直接落位到关键词所在条目（guide 整页结果不加锚点）
      var href = e.href;
      if (e.type && e.type !== 'guide') {
        var slug = window.bwSlug ? window.bwSlug(e.title) : '';
        if (slug) href = e.href + '#' + slug;
      }
      out.push({ type: e.type, href: href, title: e.title, snippet: bestSnippet(e, a), score: scoreEntry(e, a) });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, MAX_RESULTS);
  }

  /* ---------- 下拉结果 UI ---------- */
  var active = 0;

  function ensurePanel(input) {
    var host = input.closest('.hero-search');
    if (!host) return null;
    var panel = host.querySelector('.hs-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'hs-panel';
      panel.setAttribute('role', 'listbox');
      panel.hidden = true;
      host.appendChild(panel);
      // 阻止 mousedown 触发输入框失焦，避免点结果前面板先关闭
      panel.addEventListener('mousedown', function (e) { e.preventDefault(); });
    }
    return panel;
  }

  function noResultsText() {
    return document.documentElement.getAttribute('lang') === 'zh-CN'
      ? '没有找到匹配的内容'
      : 'No results found';
  }

  // 结果分类徽标文案（guide / 页面级结果不加徽标，避免视觉噪音）
  function typeLabel(type) {
    if (type === 'puzzle' || type === 'item' || type === 'radio' ||
        type === 'achievement' || type === 'question') {
      return (window.t && window.t('search.types.' + type)) || '';
    }
    return '';
  }

  function render(panel, results, input, hasQuery) {
    if (!results.length) {
      if (hasQuery) {
        panel.textContent = '';
        var empty = document.createElement('div');
        empty.className = 'hs-empty';
        empty.textContent = noResultsText();
        panel.appendChild(empty);
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      } else {
        panel.hidden = true;
        input.removeAttribute('aria-expanded');
      }
      return;
    }
    panel.textContent = '';
    results.forEach(function (r, i) {
      var a = document.createElement('a');
      a.href = r.href;
      a.className = 'hs-item' + (i === active ? ' is-active' : '');
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', i === active ? 'true' : 'false');
      var head = document.createElement('span');
      head.className = 'hs-item-head';
      var t = typeLabel(r.type);
      if (t) head.appendChild(Object.assign(document.createElement('span'), { className: 'hs-badge', textContent: t }));
      head.appendChild(Object.assign(document.createElement('span'), { className: 'hs-item-title', textContent: r.title }));
      a.appendChild(head);
      a.appendChild(Object.assign(document.createElement('span'), { className: 'hs-item-snip', textContent: r.snippet }));
      a.addEventListener('click', function (ev) { ev.preventDefault(); go(r.href, input); });
      panel.appendChild(a);
    });
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function go(href, input) {
    if (!href) return;
    // 同页锚点：不整页重载，直接平滑滚动到命中位置（首页 FAQ 等问题命中本页时用）
    var hashAt = href.indexOf('#');
    if (hashAt !== -1) {
      var page = href.slice(0, hashAt);
      var hash = href.slice(hashAt + 1);
      var cur = location.pathname.split('/').pop() || 'index.html';
      if (page === cur) {
        var target;
        try { target = document.getElementById(decodeURIComponent(hash)); }
        catch (e) { target = document.getElementById(hash); }
        if (target) {
          // 先做 DOM 状态（展开 + 高亮），滚动各自兜错，避免 scrollIntoView 异常把高亮吞掉
          if (target.tagName === 'DETAILS') target.open = true;
          target.classList.add('hash-hit');
          try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
          setTimeout(function () { target.classList.remove('hash-hit'); }, 2600);
          return;
        }
      }
    }
    window.location.href = href; // 跨页：整页跳转，落地页由 main.js 滚动到锚点
  }

  // 重算并渲染；不重置 active，只在越界时收拢
  function refresh(panel, input) {
    var hasQuery = get(input.value).trim() !== '';
    var results = search(input.value);
    if (active >= results.length) active = Math.max(0, results.length - 1);
    render(panel, results, input, hasQuery);
    return results;
  }

  function init() {
    var input = document.getElementById('hero-search-input');
    if (!input) return;
    var goBtn = document.getElementById('hero-search-go');
    var panel = ensurePanel(input);

    input.addEventListener('input', function () {
      if (get(input.value).trim() === '' && active !== 0) active = 0;
      refresh(panel, input);
    });
    input.addEventListener('focus', function () {
      if (get(input.value).trim()) refresh(panel, input);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        active = Math.min(active + 1, MAX_RESULTS - 1);
        refresh(panel, input);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.max(active - 1, 0);
        refresh(panel, input);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var results = search(input.value);
        if (results.length) go(results[Math.min(active, results.length - 1)].href, input);
      } else if (e.key === 'Escape') {
        panel.hidden = true;
        input.removeAttribute('aria-expanded');
      }
    });

    if (goBtn) goBtn.addEventListener('click', function () {
      var results = search(input.value);
      if (results.length) go(results[Math.min(active, results.length - 1)].href, input);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
