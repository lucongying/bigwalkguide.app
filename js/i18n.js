/* i18n 运行时 —— 结构与内容分离（默认英文，可切中文） */
(function () {
  'use strict';

  var DEFAULT_LANG = 'en';
  var STORAGE_KEY = 'bw-lang';
  var SUPPORTED = ['zh', 'en'];

  function getLang() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s && SUPPORTED.indexOf(s) !== -1) return s;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function dict(lang) {
    return (window.I18N && window.I18N[lang]) || {};
  }

  function lookup(lang, path) {
    var parts = path.split('.');
    var cur = dict(lang);
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  window.t = function (key) {
    var lang = getLang();
    var v = lookup(lang, key);
    if (v !== undefined && v !== null && v !== '') return v;
    var en = lookup('en', key);
    if (en !== undefined && en !== null && en !== '') return en;
    if (window.console) console.warn('[i18n] 缺少 key: ' + key);
    return key;
  };

  function apply() {
    var lang = getLang();
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = window.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = window.t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attr'); // "content:4166.description"
      var i = spec.indexOf(':');
      var attr = spec.slice(0, i);
      var key = spec.slice(i + 1);
      el.setAttribute(attr, window.t(key));
    });

    if (typeof window.onLangApplied === 'function') window.onLangApplied(lang);
  }

  window.applyI18n = apply;

  window.setLang = function (lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    apply();
  };

  // 搜索深链锚点：把条目标题（中英文均可）转成稳定的 HTML id。
  // main.js 渲染列表时用同样函数给每条打 id，search.js 用同样函数拼 #锚点，两者对上。
  window.bwSlug = function (s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[^a-z0-9㐀-鿿]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
