/* 全局组件：页头页脚 / 语言切换 / 首页与内容页的通用渲染 */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* 内联富文本：支持 **加粗**，无 ** 时等价于普通文本 */
  function appendInline(parent, text) {
    var re = /\*\*([^*]+)\*\*/g;
    var last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      parent.appendChild(el('strong', null, m[1]));
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  /* ---------- 首页：颜色 token → CSS 变量 ---------- */
  var COLORS = {
    red: 'var(--red)', green: 'var(--green)', yellow: 'var(--yellow)',
    blue: 'var(--blue)', purple: 'var(--purple)', black: 'var(--tower-black)',
    glow: 'var(--glow)', signal: 'var(--signal)', tutorial: 'var(--muted)'
  };
  function colorVar(tok) { return COLORS[tok] || COLORS.signal; }

  /* ---------- 页头 / 页脚 ---------- */
  // 当前页文件名（含 index.html 兜底），用于导航高亮
  function currentFile() {
    var file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }
  function renderChrome() {
    var header = document.querySelector('[data-header]');
    if (header) {
      header.innerHTML =
        '<header class="site-header">' +
          '<a class="brand" href="index.html">' +
            '<span class="crosshair" aria-hidden="true"></span>' +
            '<span data-i18n="nav.brand"></span>' +
          '</a>' +
          '<nav class="site-nav" aria-label="Main">' +
            '<a href="index.html" data-i18n="nav.home"></a>' +
            '<a href="big-walk-puzzles.html" data-i18n="nav.puzzles"></a>' +
            '<a href="big-walk-beginners-guide.html" data-i18n="nav.beginnersGuide"></a>' +
            '<a href="big-walk-walkthrough.html" data-i18n="nav.walkthrough"></a>' +
            '<a href="big-walk-backpacks.html" data-i18n="nav.collectibles"></a>' +
            '<a href="big-walk-achievements.html" data-i18n="nav.achievements"></a>' +
            '<a href="big-walk-faq.html" data-i18n="nav.faq"></a>' +
            '<a href="big-walk-illustrated-guides.html" data-i18n="nav.illustrated"></a>' +
          '</nav>' +
          '<button class="lang-toggle" data-lang-toggle type="button"></button>' +
        '</header>';
      // 高亮当前页所在的导航项（无匹配则不设，避免误标）
      var here = currentFile();
      if (here) {
        header.querySelectorAll('.site-nav a').forEach(function (a) {
          if (a.getAttribute('href') === here) a.classList.add('active');
        });
      }
    }
    var footer = document.querySelector('[data-footer]');
    if (footer) {
      footer.innerHTML =
        '<footer class="site-footer">' +
          '<div class="wrap">' +
            '<div class="footer-grid">' +
              '<div class="footer-brand">' +
                '<span class="brand"><span class="crosshair" aria-hidden="true"></span><span data-i18n="nav.brand"></span></span>' +
                '<p class="footer-tagline" data-i18n="footer.tagline"></p>' +
              '</div>' +
              '<div class="footer-col">' +
                '<h4 data-i18n="footer.explore"></h4>' +
                '<a href="big-walk-beginners-guide.html" data-i18n="nav.beginnersGuide"></a>' +
                '<a href="big-walk-walkthrough.html" data-i18n="nav.walkthrough"></a>' +
                '<a href="big-walk-illustrated-guides.html" data-i18n="nav.illustrated"></a>' +
                '<a href="big-walk-faq.html" data-i18n="nav.faq"></a>' +
              '</div>' +
              '<div class="footer-col">' +
                '<h4 data-i18n="footer.towers"></h4>' +
                '<a href="big-walk-map.html" data-i18n="footer.red"></a>' +
                '<a href="big-walk-green-tower.html" data-i18n="footer.green"></a>' +
                '<a href="big-walk-yellow-tower.html" data-i18n="footer.yellow"></a>' +
                '<a href="big-walk-blue-tower.html" data-i18n="footer.blue"></a>' +
                '<a href="big-walk-black-tower.html" data-i18n="footer.black"></a>' +
              '</div>' +
              '<div class="footer-col">' +
                '<h4 data-i18n="footer.endgame"></h4>' +
                '<a href="big-walk-purple-puzzles.html" data-i18n="footer.purple"></a>' +
                '<a href="big-walk-backpacks.html" data-i18n="footer.collectibles"></a>' +
                '<a href="big-walk-achievements.html" data-i18n="footer.achievements"></a>' +
              '</div>' +
              '<div class="footer-col">' +
                '<h4 data-i18n="footer.about"></h4>' +
                '<a href="about.html" data-i18n="footer.aboutUs"></a>' +
                '<a href="contact.html" data-i18n="footer.contact"></a>' +
              '</div>' +
              '<div class="footer-col">' +
                '<h4 data-i18n="footer.legal"></h4>' +
                '<a href="privacy.html" data-i18n="footer.privacy"></a>' +
                '<a href="terms.html" data-i18n="footer.terms"></a>' +
              '</div>' +
            '</div>' +
            '<div class="footer-bottom">' +
              '<p class="footer-disclaimer" data-i18n-html="footer.disclaimer"></p>' +
              '<p class="footer-copy" data-i18n="footer.copy"></p>' +
            '</div>' +
          '</div>' +
        '</footer>';
    }
  }

  /* ---------- 回到顶部按钮（避开谷歌自动广告） ---------- */
  function renderBackToTop() {
    // 幂等：build.js 会反复烘焙，先移除已存在的按钮再新建，避免重复
    var old = document.querySelector('[data-back-top]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var btn = el('button', 'back-to-top');
    btn.setAttribute('data-back-top', '');
    btn.setAttribute('type', 'button');
    // aria-label 与文案均走 i18n，随语言切换
    btn.setAttribute('data-i18n-attr', 'aria-label:backToTop');
    var arrow = el('span', 'btt-arrow', '↑'); // ↑
    arrow.setAttribute('aria-hidden', 'true');
    var label = el('span', 'btt-label');
    label.setAttribute('data-i18n', 'backToTop');
    btn.appendChild(arrow);
    btn.appendChild(label);
    document.body.appendChild(btn);
  }

  function initBackToTop() {
    var btn = document.querySelector('[data-back-top]');
    if (!btn) return;

    var SHOW_AFTER = 260;

    // 广告避让：谷歌自动广告（移动端底部锚定广告、桌面端角落广告）是以 fixed 形式
    // 异步注入 body 的。检测到广告挤占按钮所在底部区域时，把按钮抬到广告上方，
    // 保证「广告优先、彼此互不遮挡」。
    var AD_SELECTOR = 'ins.adsbygoogle, iframe[data-google-query-id], [id^="google_ads"]';

    function adLiftHeight() {
      if (!btn.classList.contains('is-visible')) return 0;
      var viewH = window.innerHeight || document.documentElement.clientHeight;
      var r = btn.getBoundingClientRect();
      var nodes = document.querySelectorAll(AD_SELECTOR);
      for (var i = 0; i < nodes.length; i++) {
        var ad = nodes[i];
        var pos = window.getComputedStyle(ad).position;
        if (pos !== 'fixed' && pos !== 'absolute') continue;
        var ar = ad.getBoundingClientRect();
        if (ar.width <= 0 || ar.height <= 0) continue;
        var inBottom = ar.bottom > viewH - 20 && ar.top < viewH;
        var overlapX = ar.left < r.right + 24 && ar.right > r.left - 24;
        if (inBottom && overlapX) return viewH - ar.top;
      }
      return 0;
    }

    function updateLift() {
      var h = adLiftHeight();
      if (h > 0) {
        btn.style.bottom = (h + 14) + 'px';
        btn.classList.add('is-lifted');
      } else {
        btn.style.bottom = '';
        btn.classList.remove('is-lifted');
      }
    }

    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle('is-visible', y > SHOW_AFTER);
      updateLift();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateLift);

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.addEventListener('click', function () {
      try { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
      catch (e) { window.scrollTo(0, 0); }
    });

    // 广告常异步注入，监听新增节点后重新测量
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { updateLift(); return; }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('load', function () { setTimeout(updateLift, 400); });

    onScroll();
  }

  function initLangToggle() {
    var btn = document.querySelector('[data-lang-toggle]');
    if (!btn) return;
    function sync() {
      var zh = document.documentElement.getAttribute('lang') === 'zh-CN';
      btn.textContent = zh ? 'EN' : '中文';
    }
    btn.addEventListener('click', function () {
      var zh = document.documentElement.getAttribute('lang') === 'zh-CN';
      window.setLang(zh ? 'en' : 'zh');
      sync();
    });
    sync();
  }

  /* ---------- 首页：可点卡片（整卡都是链接） ---------- */
  function guideCard(kind, c) {
    var a = el('a', 'guide-card');
    a.setAttribute('href', c.href || '#');
    a.setAttribute('data-card-text', (c.name + ' ' + (c.desc || '') + ' ' + (c.coord || '')).toLowerCase());
    a.style.setProperty('--tc', colorVar(c.color));
    a.className += ' gc-' + (c.color || 'signal');
    if (kind === 'tower') a.className += ' guide-card--tower';
    if (kind === 'purple') a.className += ' guide-card--purple';
    if (kind === 'index') a.className += ' guide-card--index';
    if (c.icon) a.appendChild(el('div', 'gc-icon', c.icon));
    var main = el('div', 'gc-main');
    var name = el('h3', 'gc-name');
    name.appendChild(document.createTextNode(c.name));
    var badge = c.badge || c.meta;
    if (badge) name.appendChild(el('span', 'gc-badge', badge));
    main.appendChild(name);
    if (c.desc) main.appendChild(el('p', 'gc-desc', c.desc));
    if (c.coord) main.appendChild(el('span', 'gc-coord', c.coord));
    if (c.cta !== false) {
      var cta = el('span', 'gc-cta');
      cta.appendChild(document.createTextNode(window.t('home.cardCta')));
      cta.appendChild(el('span', 'arrow', '→'));
      main.appendChild(cta);
    }
    a.appendChild(main);
    return a;
  }

  function renderCollection(mount) {
    var id = mount.getAttribute('data-guides');
    var kind = mount.getAttribute('data-kind') || 'feature';
    var cards = window.t('home.collections.' + id);
    if (!Array.isArray(cards)) return;
    mount.textContent = '';
    cards.forEach(function (c) { mount.appendChild(guideCard(kind, c)); });
  }

  function renderGuides() {
    document.querySelectorAll('[data-guides]').forEach(renderCollection);
  }

  /* ---------- 首页：塔序路线图（五彩圆点 + 连线 + 终点环） ---------- */
  function renderRoute() {
    var wrap = document.querySelector('[data-route]');
    if (!wrap) return;
    var nodes = window.t('home.route.nodes');
    if (!Array.isArray(nodes)) return;
    wrap.textContent = '';
    nodes.forEach(function (it) {
      var a = el('a', 'route-node');
      a.setAttribute('href', it.href || '#');
      a.style.setProperty('--rd', colorVar(it.color));
      if (it.end) a.classList.add('route-node--end');
      a.appendChild(el('span', 'route-dot'));
      a.appendChild(el('span', 'route-name', it.label));
      if (it.sub) a.appendChild(el('span', 'route-sub', it.sub));
      wrap.appendChild(a);
    });
  }

  /* ---------- 首页：5 座切割台顺序条 ---------- */
  function renderCuttersRun() {
    var wrap = document.querySelector('[data-cutters-run]');
    if (!wrap) return;
    var items = window.t('home.cuttersRun');
    if (!Array.isArray(items)) return;
    wrap.textContent = '';
    items.forEach(function (it, i) {
      var card = el('div', 'cutter-step');
      card.style.setProperty('--tc', colorVar(it.color));
      card.appendChild(el('span', 'cs-num', String(i + 1)));
      var body = el('div', 'cs-body');
      body.appendChild(el('span', 'cs-lbl', it.label));
      if (it.desc) body.appendChild(el('p', 'cs-desc', it.desc));
      card.appendChild(body);
      wrap.appendChild(card);
      if (i < items.length - 1) wrap.appendChild(el('span', 'cutter-arrow', '→'));
    });
  }

  /* ---------- 首页：塔通关顺序里程碑 ---------- */
  function renderTowerOrder() {
    var wrap = document.querySelector('[data-tower-order]');
    if (!wrap) return;
    var items = window.t('home.towerOrder');
    if (!Array.isArray(items)) return;
    wrap.textContent = '';
    items.forEach(function (it) {
      var a = el('a', 'milestone');
      a.setAttribute('href', it.href || '#');
      a.style.setProperty('--ms-accent', colorVar(it.color));
      a.appendChild(el('span', 'ms-lv', it.tag));
      a.appendChild(document.createTextNode(it.label));
      wrap.appendChild(a);
    });
  }

  /* ---------- 首页：收集路线条（胶囊站点 + 箭头） ---------- */
  function renderRouteRun() {
    var wrap = document.querySelector('[data-route-run]');
    if (!wrap) return;
    var items = window.t('home.routeRun');
    if (!Array.isArray(items)) return;
    wrap.textContent = '';
    var elSlots = [];
    items.forEach(function (it) {
      var s = el('span', 'route-stop');
      s.appendChild(document.createTextNode(it.label));
      elSlots.push(s);
    });
    elSlots.forEach(function (s, i) {
      if (i > 0) wrap.appendChild(el('span', 'route-arrow', '→'));
      wrap.appendChild(s);
    });
  }

  /* ---------- 首页：站内速查（全站搜索由 js/search.js 接管，见 hero-search-input） ---------- */

  /* ---------- 首页：滚动渐入（渐进增强，无 IO 时全显） ---------- */
  function initReveal() {
    var targets = document.querySelectorAll('.section-head, .core-strip, [data-guides], .cutter-run, .route-run, .cta .wrap');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (ent) {
        if (ent.isIntersecting) { ent.target.classList.add('visible'); io.unobserve(ent.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (t) { t.classList.add('reveal'); io.observe(t); });
  }

  /* ---------- 内容页 ---------- */
  function renderPrereq() {
    document.querySelectorAll('[data-prereq]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-prereq'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      var ul = el('ul');
      items.forEach(function (item) {
        ul.appendChild(el('li', null, item));
      });
      wrap.appendChild(ul);
    });
  }

  function renderSteps() {
    document.querySelectorAll('[data-steps]').forEach(function (wrap) {
      var steps = window.t(wrap.getAttribute('data-steps'));
      if (!Array.isArray(steps)) return;
      wrap.textContent = '';
      steps.forEach(function (s, i) {
        var li = el('li', 'step');
        li.appendChild(el('span', 'step-num', String(i + 1).padStart(2, '0')));
        li.appendChild(el('h3', null, s.heading));
        li.appendChild(el('p', null, s.body));
        wrap.appendChild(li);
      });
    });
  }

  function renderCutters() {
    document.querySelectorAll('[data-cutters]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-cutters'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      var list = el('ul', 'cutter-list');
      items.forEach(function (c) {
        var li = el('li', 'cutter');
        var head = el('div', 'cutter-head');
        head.appendChild(el('span', 'dot ' + (c.color || 'red')));
        head.appendChild(el('span', 'cutter-name', c.tower));
        head.appendChild(el('span', 'cutter-count', c.count));
        li.appendChild(head);
        var meta = el('div', 'cutter-meta');
        if (c.source) meta.appendChild(el('span', 'cutter-source', c.source));
        meta.appendChild(document.createTextNode(c.loc));
        li.appendChild(meta);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    });
  }

  function renderPuzzles() {
    document.querySelectorAll('[data-puzzles]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-puzzles'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      var list = el('ul', 'cutter-list');
      items.forEach(function (p) {
        var slug = window.bwSlug(p.name);
        var head = el('div', 'cutter-head');
        head.appendChild(el('span', 'dot ' + (p.color || 'red')));
        var name = el('span', 'cutter-name', p.name);
        head.appendChild(name);
        if (p.coord) head.appendChild(el('span', 'cutter-count', p.coord));

        var meta = el('div', 'cutter-meta');
        if (p.desc) meta.appendChild(document.createTextNode(p.desc));

        if (p.href) {
          // 整卡可点：把整张卡做成一个链接，点标题/描述/标签任意位置都能进入
          var card = el('a', 'cutter puzzle-card ' + (p.color || ''));
          card.setAttribute('href', p.href);
          card.appendChild(head);
          card.appendChild(meta);
          var li = el('li', 'cutter-row');
          li.setAttribute('id', slug);
          li.appendChild(card);
          list.appendChild(li);
        } else {
          var li = el('li', 'cutter puzzle-card ' + (p.color || ''));
          li.setAttribute('id', slug);
          li.appendChild(head);
          li.appendChild(meta);
          list.appendChild(li);
        }
      });
      wrap.appendChild(list);
    });
  }

  function renderReading() {
    document.querySelectorAll('[data-reading]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-reading'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      items.forEach(function (it) {
        var h = el('h3', 'reading-title');
        if (it.href) {
          var a = el('a', 'reading-link');
          a.setAttribute('href', it.href);
          a.appendChild(document.createTextNode(it.heading));
          a.appendChild(el('span', 'arrow', '→'));
          h.appendChild(a);
        } else {
          h.appendChild(document.createTextNode(it.heading));
        }
        wrap.appendChild(h);
        wrap.appendChild(el('p', null, it.body));
      });
    });
  }

  function renderPitfalls() {
    document.querySelectorAll('[data-pitfalls]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-pitfalls'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      items.forEach(function (it) {
        var d = el('details', 'pitfall');
        d.setAttribute('id', window.bwSlug(it.q));
        d.appendChild(el('summary', null, it.q));
        d.appendChild(el('p', null, it.a));
        wrap.appendChild(d);
      });
    });
  }

  function renderRelated() {
    document.querySelectorAll('[data-related]').forEach(function (wrap) {
      var items = window.t(wrap.getAttribute('data-related'));
      if (!Array.isArray(items)) return;
      wrap.textContent = '';
      items.forEach(function (it) {
        var a = el('a', 'related-link');
        a.setAttribute('href', it.href || '#');
        a.appendChild(document.createTextNode(it.label));
        a.appendChild(el('span', 'arrow', '→'));
        wrap.appendChild(a);
      });
    });
  }

  /* ---------- 图文攻略：配图分步文章（图文攻略子页） ---------- */
  function renderIllustrated() {
    document.querySelectorAll('[data-illustrated-guide]').forEach(function (wrap) {
      // 子页可通过 data-illustrated-guide 指定具体的 guide 数据键（默认仍为 illustrated.guide）
      var key = wrap.getAttribute('data-illustrated-guide') || 'illustrated.guide';
      var g = window.t(key);
      if (!g || !g.steps) return;
      wrap.textContent = '';

      var section = el('section', 'iguide');
      if (g.eyebrow) section.appendChild(el('p', 'ig-eyebrow', g.eyebrow));
      if (g.title) {
        var t = el('h1', 'ig-title');
        t.appendChild(document.createTextNode(g.title));
        section.appendChild(t);
      }
      // 标题下：作者 + 更新时间（byline），作者取字典会同时支持中英文
      if (g.author || g.updated) {
        var bits = [];
        if (g.author) bits.push(window.t('illustrated.byAuthor').replace(/\{author\}/g, g.author));
        if (g.updated) bits.push(window.t('illustrated.byUpdated').replace(/\{date\}/g, g.updated));
        section.appendChild(el('p', 'ig-byline', bits.join(' · ')));
      }
      if (g.intro) section.appendChild(el('p', 'lead ig-intro', g.intro));

      var ol = el('ol', 'steps iguide-steps');
      g.steps.forEach(function (s, i) {
        var li = el('li', 'step ig-step' + (s.accent ? ' accent-' + s.accent : ''));
        li.appendChild(el('span', 'step-num', String(i + 1).padStart(2, '0')));
        li.appendChild(el('h3', null, s.heading));
        if (s.image) {
          var fig = el('figure', 'ig-fig');
          var img = document.createElement('img');
          img.setAttribute('src', s.image);
          img.setAttribute('alt', s.alt || '');
          fig.appendChild(img);
          if (s.caption) fig.appendChild(el('figcaption', null, s.caption));
          li.appendChild(fig);
        }
        if (s.body && s.body.length) {
          var body = el('div', 'ig-step-body');
          s.body.forEach(function (p) {
            if (p && typeof p === 'object') {
              var fig = el('figure', 'ig-fig');
              var img = document.createElement('img');
              img.setAttribute('src', p.image);
              img.setAttribute('alt', p.alt || '');
              fig.appendChild(img);
              if (p.caption) fig.appendChild(el('figcaption', null, p.caption));
              body.appendChild(fig);
            } else {
              var para = el('p', null);
              appendInline(para, p);
              body.appendChild(para);
            }
          });
          li.appendChild(body);
        }
        ol.appendChild(li);
      });
      section.appendChild(ol);

      if (g.closing) section.appendChild(el('p', 'ig-closing', g.closing));

      if (g.further && g.further.length) {
        var nav = el('div', 'ig-related');
        if (g.furtherTitle) nav.appendChild(el('h3', 'ig-related-title', g.furtherTitle));
        g.further.forEach(function (f) {
          var a = el('a', 'related-link');
          a.setAttribute('href', f.href || '#');
          a.appendChild(document.createTextNode(f.label));
          a.appendChild(el('span', 'arrow', '→'));
          nav.appendChild(a);
        });
        section.appendChild(nav);
      }

      wrap.appendChild(section);
    });
  }

  /* ---------- 图文攻略子页：卡片列表（每个卡片指向一篇图攻略页） ---------- */
  function renderIllustratedList() {
    document.querySelectorAll('[data-illustrated-list]').forEach(function (wrap) {
      var items = window.t('illustrated.list');
      if (!Array.isArray(items) || !items.length) return;
      wrap.textContent = '';
      var list = el('ul', 'iguide-list');
      items.forEach(function (c) {
        var li = el('li', 'ig-card-li');
        var a = el('a', 'ig-card');
        a.setAttribute('href', c.page || '#');
        if (c.cover) {
          var img = document.createElement('img');
          img.setAttribute('src', c.cover);
          img.setAttribute('alt', c.alt || '');
          a.appendChild(img);
        }
        var body = el('div', 'ig-card-body');
        body.appendChild(el('h3', 'ig-card-title', c.title));
        if (c.desc) body.appendChild(el('p', 'ig-card-desc', c.desc));
        var cta = el('span', 'ig-card-cta');
        cta.appendChild(document.createTextNode(window.t('illustrated.readCta')));
        cta.appendChild(el('span', 'arrow', '→'));
        body.appendChild(cta);
        a.appendChild(body);
        li.appendChild(a);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    });
  }

  /* ---------- 图文攻略：深度测评（介绍式，非步骤、不强制配图） ---------- */
  function renderReview() {
    document.querySelectorAll('[data-review]').forEach(function (wrap) {
      var key = wrap.getAttribute('data-review') || 'illustrated.review';
      var r = window.t(key);
      if (!r || !r.sections) return;
      wrap.textContent = '';

      var section = el('section', 'iguide');
      if (r.eyebrow) section.appendChild(el('p', 'ig-eyebrow', r.eyebrow));
      if (r.title) section.appendChild(el('h1', 'ig-title', r.title));
      if (r.author || r.updated) {
        var bits = [];
        if (r.author) bits.push(window.t('illustrated.byAuthor').replace(/\{author\}/g, r.author));
        if (r.updated) bits.push(window.t('illustrated.byUpdated').replace(/\{date\}/g, r.updated));
        section.appendChild(el('p', 'ig-byline', bits.join(' · ')));
      }
      if (r.intro) section.appendChild(el('p', 'lead ig-intro', r.intro));

      r.sections.forEach(function (s) {
        var blk = el('section', 'review-section');
        if (s.heading) blk.appendChild(el('h2', null, s.heading));
        if (s.image) {
          var fig = el('figure', 'ig-fig');
          var img = document.createElement('img');
          img.setAttribute('src', s.image);
          img.setAttribute('alt', s.alt || '');
          fig.appendChild(img);
          if (s.caption) fig.appendChild(el('figcaption', null, s.caption));
          blk.appendChild(fig);
        }
        if (s.paras && s.paras.length) {
          s.paras.forEach(function (p) {
            var para = el('p', null);
            appendInline(para, p);
            blk.appendChild(para);
          });
        }
        section.appendChild(blk);
      });

      if (r.pullQuote) section.appendChild(el('blockquote', 'ig-pullquote', r.pullQuote));
      wrap.appendChild(section);
    });
  }

  function renderItems() {
    document.querySelectorAll('[data-items]').forEach(function (wrap) {
      var data = window.t(wrap.getAttribute('data-items'));
      if (!data || !data.groups) return;
      wrap.textContent = '';
      if (data.intro) wrap.appendChild(el('p', 'item-intro', data.intro));
      data.groups.forEach(function (g) {
        wrap.appendChild(el('h3', 'item-group', g.title));
        var list = el('ul', 'item-list');
        g.items.forEach(function (it) {
          var li = el('li', 'item');
          li.setAttribute('id', window.bwSlug(it.name));
          var head = el('div', 'item-head');
          head.appendChild(el('span', 'item-name', it.name));
          if (it.tag) head.appendChild(el('span', 'item-tag', it.tag));
          li.appendChild(head);
          if (it.use) {
            var u = el('p', 'item-use');
            u.appendChild(el('span', 'item-label', data.useLabel));
            u.appendChild(document.createTextNode(it.use));
            li.appendChild(u);
          }
          if (it.where) {
            var w = el('p', 'item-where');
            w.appendChild(el('span', 'item-label', data.whereLabel));
            w.appendChild(document.createTextNode(it.where));
            li.appendChild(w);
          }
          list.appendChild(li);
        });
        wrap.appendChild(list);
      });
    });
  }

  /* ---------- 深链锚点：落地后滚动到关键词位置并高亮 ---------- */
  // 文章型子页（如紫色谜题详情）的标题是烘焙好的 <h1 data-i18n>，不上列表渲染。
  // 这里给这类标题也补 id，让搜索深链能定位到标题本身。
  function anchorHeadings() {
    document.querySelectorAll('article h1, .ig-title').forEach(function (h) {
      if (!h.id && h.textContent) h.id = window.bwSlug(h.textContent);
    });
  }

  // 页面加载后若带 #锚点，滚到对应条目、展开命中折叠的 FAQ 并短暂高亮。
  // 内容由 applyI18n 渲染，必须在渲染之后调用（DOMContentLoaded 里紧跟 applyI18n）。
  function initHashScroll() {
    var raw = location.hash;
    if (!raw) return;
    var id;
    try { id = decodeURIComponent(raw.slice(1)); } catch (e) { id = raw.slice(1); }
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    // 先做 DOM 状态（展开 + 高亮），滚动各自兜错，避免 scrollIntoView 异常把高亮吞掉
    if (target.tagName === 'DETAILS') target.open = true;
    target.classList.add('hash-hit');
    try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
    setTimeout(function () { target.classList.remove('hash-hit'); }, 2600);
  }

  /* ---------- 总渲染 ---------- */
  function render() {
    renderRoute();
    renderGuides();
    renderCuttersRun();
    renderTowerOrder();
    renderRouteRun();
    renderPrereq();
    renderSteps();
    renderCutters();
    renderPuzzles();
    renderReading();
    renderPitfalls();
    renderRelated();
    renderItems();
    renderIllustrated();
    renderIllustratedList();
    renderReview();
  }

  window.onLangApplied = function () { render(); };

  document.addEventListener('DOMContentLoaded', function () {
    renderChrome();
    renderBackToTop();
    initLangToggle();
    window.applyI18n();
    anchorHeadings();
    initHashScroll();
    initReveal();
    initBackToTop();
  });
})();
