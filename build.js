/*
 * build.js —— 预渲染（SSR 化）
 *
 * 背景：本站内容是纯客户端渲染（CSR）——正文全部由 js/main.js 从
 * i18n/*.js 注入到空 HTML 骨架上，不执行 JS 时页面近乎空白。
 * 这对 SEO 和 Google AdSense 审核都不利（AdSense 爬虫对纯 JS 内容不可靠）。
 *
 * 做法：用 jsdom 真实加载并执行本站脚本（i18n.js + main.js），
 * 得到与浏览器逐字节一致的渲染结果，然后把默认语言（英文）的内容
 * 烘焙进静态 HTML。爬虫不用执行 JS 也能读到全部正文。
 *
 * 复用：只要 i18n/*.js 或 main.js 改动，重跑 `npm run build` 即可重新烘焙。
 * 内容源仍是 i18n/*.js（单一数据源），烘焙不改变浏览器的语言切换行为。
 *
 * 用法：node build.js   /   npm run build
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const SITE = 'https://bigwalkguide.app/';

// 关键脚本按页面真实引用顺序执行（zh/en 为数据，i18n/main 为逻辑）
const SCRIPTS = ['i18n/zh.js', 'i18n/en.js', 'js/i18n.js', 'js/main.js'];

// 烘焙面向的默认语言（站默认英文，国际用户）
const BAKE_LANG = 'en';

// 判断是否为可烘焙的页面（跳过 node_modules 与文档目录）
const HTML_FILES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

function bake(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const dom = new JSDOM(html, {
    url: SITE + file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // 强制默认语言，保证烘焙结果稳定
  try { window.localStorage.setItem('bw-lang', BAKE_LANG); } catch (e) {}

  // 按真实顺序注入脚本：zh.js / en.js（数据）→ i18n.js → main.js（逻辑）
  for (const s of SCRIPTS) {
    const code = fs.readFileSync(path.join(ROOT, s), 'utf8');
    window.eval(code);
  }

  // 触发 DOMContentLoaded，让其运行 renderChrome + applyI18n(fill + render)
  const doc = window.document;
  doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  // 兜底：显式再跑一次 applyI18n，避免 readyState 时序差异
  if (typeof window.applyI18n === 'function') window.applyI18n();

  // 首页有「滚动渐入」类（.reveal），jsdom 无 IntersectionObserver 时保持不可见，
  // 烘焙时统一去掉，确保爬虫读到的是可见内容。
  doc.querySelectorAll('.reveal').forEach((el) => {
    el.classList.remove('reveal');
    el.classList.add('visible');
  });
  doc.querySelectorAll('[data-reveal]').forEach((el) => {
    el.classList.remove('reveal');
    el.classList.add('visible');
  });

  return dom.serialize();
}

let changed = 0;
let failed = [];

for (const file of HTML_FILES) {
  try {
    const out = bake(file);
    fs.writeFileSync(path.join(ROOT, file), out, 'utf8');
    changed++;
    console.log('✓ baked: ' + file);
  } catch (err) {
    failed.push(file);
    console.error('✗ FAILED: ' + file + ' — ' + err.message);
  }
}

console.log('\n-- build done --');
console.log('baked ' + changed + ' / ' + HTML_FILES.length + ' pages');
if (failed.length) {
  console.log('FAILED: ' + failed.join(', '));
  process.exit(1);
}
