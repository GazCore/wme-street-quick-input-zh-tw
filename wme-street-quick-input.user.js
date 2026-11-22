// ==UserScript==
// @name         WME 街道名稱快速輸入（繁中）
// @namespace    https://greasyfork.org/
// @version      0.2.0
// @author       Gaz
// @license      MIT
// @homepageURL  https://github.com/GazCore/wme-street-quick-input-zh-tw
// @updateURL    https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @downloadURL  https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @description  在 WME 輸入街道名稱、盾形路牌文字與方向時，顯示對應的快捷按鈕（路街段巷弄、省縣市區鄉道、方位、數字、天干），減少打字
// @match        https://www.waze.com/*editor*
// @match        https://beta.waze.com/*editor*
// @match        https://www.waze.com/*/editor*
// @match        https://beta.waze.com/*/editor*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 按鈕列位置：'right'（輸入框右側，預設，不會擋住下方的建議清單）
  //            'above'（輸入框上方）、'below'（輸入框下方）
  const POSITION = 'right';
  const GAP = 24; // 與輸入框的間距（px）

  // 可自行增減按鈕。每個版面對應一種輸入框：
  //   hints：以輸入框的 placeholder 判斷（不分大小寫、部分符合即可）
  //   rows ：每個子陣列是一列按鈕
  const LAYOUTS = {
    // 街道名稱
    street: {
      hints: ['輸入街道', 'street name', 'enter street'],
      rows: [
        ['路', '街', '段', '巷', '弄'],
        ['省道', '市道', '縣道', '區道', '鄉道'],
        ['東', '西', '南', '北'],
        ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
        ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
      ],
    },
    // 盾形路牌的「盾牌文字」
    shield: {
      hints: ['使用數字和字母', 'numbers and letters', 'letters and numbers'],
      rows: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
        ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
      ],
    },
    // 盾形路牌的「方向」
    direction: {
      hints: ['輸入方向', 'enter direction'],
      rows: [['東', '西', '南', '北']],
    },
  };

  const bars = {}; // 依版面名稱快取已建立的按鈕列
  let activeBar = null;
  let currentInput = null;

  function placeholderOf(el) {
    const own = (el.placeholder || '').toLowerCase();
    const host = el.getRootNode && el.getRootNode().host;
    const hostPh = host && host.getAttribute ? (host.getAttribute('placeholder') || '').toLowerCase() : '';
    return own + ' ' + hostPh;
  }

  // 回傳此輸入框對應的版面名稱；不符合則回傳 null
  function getLayoutName(el) {
    if (!el || el.tagName !== 'INPUT') return null;
    const ph = placeholderOf(el);
    for (const [name, layout] of Object.entries(LAYOUTS)) {
      if (layout.hints.some((h) => ph.includes(h.toLowerCase()))) return name;
    }
    return null;
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

  function buildBar(name) {
    const el = document.createElement('div');
    el.className = 'wme-street-quick';
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: 2147483000,
      display: 'none',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '4px 6px',
      boxShadow: '0 2px 8px rgba(0,0,0,.25)',
      maxWidth: '420px',
    });

    // 避免點擊按鈕列被對話框當成「點擊外部」而關閉
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click'].forEach((type) =>
      el.addEventListener(type, (e) => e.stopPropagation())
    );

    LAYOUTS[name].rows.forEach((row) => {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;align-items:center;gap:3px;margin:3px 0;';

      row.forEach((label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText =
          'min-width:30px;padding:3px 6px;font-size:14px;text-align:center;border:1px solid #bbb;border-radius:5px;background:#f4f6f8;color:#222;cursor:pointer;';
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

  function showBar(input, name) {
    if (activeBar && activeBar !== bars[name]) activeBar.style.display = 'none';
    if (!bars[name]) bars[name] = buildBar(name);
    activeBar = bars[name];
    currentInput = input;

    const rect = input.getBoundingClientRect();
    activeBar.style.display = 'block';
    const w = activeBar.offsetWidth;
    const h = activeBar.offsetHeight;
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
    activeBar.style.left = clamp(left, 4, Math.max(4, vw - w - 4)) + 'px';
    activeBar.style.top = clamp(top, 4, Math.max(4, vh - h - 4)) + 'px';
  }

  function hideBar() {
    if (activeBar) activeBar.style.display = 'none';
    activeBar = null;
    currentInput = null;
  }

  // focusin 是 composed 事件，可穿透 shadow DOM
  document.addEventListener('focusin', (e) => {
    const target = e.composedPath()[0];
    const name = getLayoutName(target);
    if (name) showBar(target, name);
  });

  document.addEventListener('focusout', (e) => {
    const target = e.composedPath()[0];
    if (target !== currentInput) return;
    setTimeout(() => {
      const ae = document.activeElement;
      const active = ae && ae.shadowRoot ? ae.shadowRoot.activeElement : ae;
      if (active !== currentInput) hideBar();
    }, 150);
  });
})();
