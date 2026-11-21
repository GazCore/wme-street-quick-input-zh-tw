// ==UserScript==
// @name         WME 街道名稱快速輸入（繁中）
// @namespace    https://greasyfork.org/
// @version      0.1.2
// @author       Gaz
// @license      MIT
// @homepageURL  https://github.com/GazCore/wme-street-quick-input-zh-tw
// @updateURL    https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @downloadURL  https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @description  在 Waze Map Editor 輸入街道名稱時，顯示 路/段/街/巷/弄/號 與數字快捷按鈕，減少打字
// @match        https://www.waze.com/*editor*
// @match        https://beta.waze.com/*editor*
// @match        https://www.waze.com/*/editor*
// @match        https://beta.waze.com/*/editor*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 可自行增減按鈕
  const ROWS = [
    ['路', '街', '大道', '段', '巷', '弄', '號', '之'],
    ['東', '西', '南', '北', '一', '二', '三', '四', '五'],
    ['六', '七', '八', '九', '十', '中正', '中山', '縣道', '鄉道'],
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
  ];

  // 按鈕列位置：'right'（輸入框右側，預設，不會擋住下方的建議清單）
  //            'above'（輸入框上方）、'below'（輸入框下方，會擋住建議清單）
  const POSITION = 'right';
  const GAP = 24; // 與輸入框的間距（px）

  // 判斷是否為街道名稱輸入框（依 placeholder 或所在標籤）
  const STREET_HINTS = ['輸入街道', 'street name', 'enter street'];

  let bar = null;
  let currentInput = null;

  function isStreetInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    const ph = (el.placeholder || '').toLowerCase();
    if (STREET_HINTS.some((h) => ph.includes(h.toLowerCase()))) return true;
    // 輸入框在 shadow DOM 內時，檢查宿主元素
    const host = el.getRootNode && el.getRootNode().host;
    if (host) {
      const hph = (host.getAttribute('placeholder') || '').toLowerCase();
      if (STREET_HINTS.some((h) => hph.includes(h.toLowerCase()))) return true;
    }
    return false;
  }

  function insertText(input, text) {
    input.focus();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newValue = input.value.slice(0, start) + text + input.value.slice(end);

    // 使用原生 setter，確保 WME 的框架能偵測到變更
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, newValue);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);

    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text, inputType: 'insertText' }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function buildBar() {
    const el = document.createElement('div');
    el.id = 'wme-street-quick';
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: 99999,
      display: 'none',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,.25)',
      maxWidth: '360px',
    });

    ROWS.forEach((row) => {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin:2px 0;';
      row.forEach((label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText =
          'padding:3px 8px;font-size:14px;border:1px solid #bbb;border-radius:5px;background:#f4f6f8;cursor:pointer;';
        // mousedown 時阻止預設，避免輸入框失去焦點
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          if (currentInput) insertText(currentInput, label);
        });
        r.appendChild(b);
      });
      el.appendChild(r);
    });

    document.body.appendChild(el);
    return el;
  }

  function showBar(input) {
    if (!bar) bar = buildBar();
    currentInput = input;
    const rect = input.getBoundingClientRect();
    bar.style.display = 'block';
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

    let mode = POSITION;
    // 右側空間不足時，改放在輸入框上方
    if (mode === 'right' && rect.right + GAP + w > vw) mode = 'above';

    let left, top;
    if (mode === 'right') {
      left = rect.right + GAP;
      top = rect.top;
    } else if (mode === 'above') {
      left = rect.left;
      top = rect.top - h - 4;
    } else {
      left = rect.left;
      top = rect.bottom + 4;
    }
    bar.style.left = clamp(left, 4, Math.max(4, vw - w - 4)) + 'px';
    bar.style.top = clamp(top, 4, Math.max(4, vh - h - 4)) + 'px';
  }

  function hideBar() {
    if (bar) bar.style.display = 'none';
    currentInput = null;
  }

  // focusin 是 composed 事件，可穿透 shadow DOM
  document.addEventListener('focusin', (e) => {
    const target = e.composedPath()[0];
    if (isStreetInput(target)) showBar(target);
  });

  document.addEventListener('focusout', (e) => {
    const target = e.composedPath()[0];
    if (target === currentInput) setTimeout(() => {
      const active = (document.activeElement && document.activeElement.shadowRoot
        ? document.activeElement.shadowRoot.activeElement
        : document.activeElement);
      if (active !== currentInput) hideBar();
    }, 150);
  });
})();
