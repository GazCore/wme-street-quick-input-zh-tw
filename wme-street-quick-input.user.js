// ==UserScript==
// @name         WME 街道名稱快速輸入（繁中）
// @namespace    https://greasyfork.org/
// @version      0.3.0
// @author       Gaz
// @license      MIT
// @homepageURL  https://github.com/GazCore/wme-street-quick-input-zh-tw
// @updateURL    https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @downloadURL  https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js
// @description  在 WME 輸入街道名稱、盾形路牌文字與方向時，顯示對應的快捷按鈕（路街段巷弄、市縣區鄉道、方位、數字、天干），減少打字。可在側邊欄設定位置與按鈕內容
// @match        https://www.waze.com/*editor*
// @match        https://beta.waze.com/*editor*
// @match        https://www.waze.com/*/editor*
// @match        https://beta.waze.com/*/editor*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ───────────── 基本資訊 ─────────────
  const SCRIPT_ID = 'wme-street-quick-input-zh-tw';
  const SCRIPT_NAME = 'WME 街道名稱快速輸入';
  const TAB_LABEL = '街道文字快輸';
  const STORAGE_KEY = 'wme-street-quick-input-zh-tw:settings';
  const SDK_WAIT_TRIES = 80; // 最多等待 SDK 約 20 秒（80 × 250ms）
  const READY_TIMEOUT_MS = 15000; // wme-ready 未觸發時的保險啟動時間

  // ───────────── 預設版面 ─────────────
  // name：設定面板中顯示的名稱
  // hints：以輸入框的 placeholder 判斷（不分大小寫、部分符合即可）
  // rows：每個子陣列是一列按鈕
  const DEFAULT_LAYOUTS = {
    // 街道名稱
    street: {
      name: '街道名稱',
      hints: ['輸入街道', 'street name', 'enter street'],
      rows: [
        ['路', '街', '段', '巷', '弄'],
        ['市道', '縣道', '區道', '鄉道'],
        ['東', '西', '南', '北'],
        ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
        ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
      ],
    },
    // 盾形路牌的「盾牌文字」
    shield: {
      name: '盾牌文字',
      hints: ['使用數字和字母', 'numbers and letters', 'letters and numbers'],
      rows: [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
        ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
      ],
    },
    // 盾形路牌的「方向」
    direction: {
      name: '方向',
      hints: ['輸入方向', 'enter direction'],
      rows: [['東', '西', '南', '北']],
    },
  };

  const POSITIONS = { right: '輸入框右側', above: '輸入框上方', below: '輸入框下方' };

  // ───────────── 設定（存在 localStorage） ─────────────
  const DEFAULT_SETTINGS = {
    position: 'right', // 'right' | 'above' | 'below'
    gap: 24, // 與輸入框的間距（px）
    enabled: { street: true, shield: true, direction: true },
    rows: {}, // 自訂按鈕：{ street: [[...], ...], ... }；沒設定的版面使用預設
  };

  function loadSettings() {
    const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (POSITIONS[saved.position]) s.position = saved.position;
      if (Number.isFinite(saved.gap)) s.gap = Math.max(0, Math.min(200, saved.gap));
      if (saved.enabled) {
        Object.keys(s.enabled).forEach((k) => {
          if (typeof saved.enabled[k] === 'boolean') s.enabled[k] = saved.enabled[k];
        });
      }
      if (saved.rows && typeof saved.rows === 'object') {
        Object.keys(DEFAULT_LAYOUTS).forEach((k) => {
          const rows = saved.rows[k];
          if (Array.isArray(rows) && rows.length && rows.every((r) => Array.isArray(r) && r.length)) {
            s.rows[k] = rows.map((r) => r.map(String));
          }
        });
      }
    } catch (err) {
      console.warn(`[${SCRIPT_NAME}] 讀取設定失敗，使用預設值`, err);
    }
    return s;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn(`[${SCRIPT_NAME}] 儲存設定失敗`, err);
    }
  }

  let settings = loadSettings();

  function rowsOf(name) {
    return settings.rows[name] || DEFAULT_LAYOUTS[name].rows;
  }

  // 文字 ↔ 按鈕列：每行一列，按鈕以空白分隔
  function rowsToText(rows) {
    return rows.map((r) => r.join(' ')).join('\n');
  }
  function textToRows(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/).filter(Boolean))
      .filter((r) => r.length);
  }

  // ───────────── 輸入框辨識 ─────────────
  const bars = {}; // 依版面名稱快取已建立的按鈕列
  let activeBar = null;
  let currentInput = null;

  function placeholderOf(el) {
    const own = (el.placeholder || '').toLowerCase();
    const host = el.getRootNode && el.getRootNode().host;
    const hostPh = host && host.getAttribute ? (host.getAttribute('placeholder') || '').toLowerCase() : '';
    return own + ' ' + hostPh;
  }

  // 回傳此輸入框對應的版面名稱；不符合或已停用則回傳 null
  function getLayoutName(el) {
    if (!el || el.tagName !== 'INPUT') return null;
    const ph = placeholderOf(el);
    for (const [name, layout] of Object.entries(DEFAULT_LAYOUTS)) {
      if (layout.hints.some((h) => ph.includes(h.toLowerCase()))) {
        return settings.enabled[name] ? name : null;
      }
    }
    return null;
  }

  // ───────────── 插入文字 ─────────────
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

  // ───────────── 按鈕列 ─────────────
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

    rowsOf(name).forEach((row) => {
      const r = document.createElement('div');
      r.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin:3px 0;';

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

  // 設定變更後，清掉已建立的按鈕列，下次聚焦時重建
  function resetBars() {
    Object.keys(bars).forEach((k) => {
      bars[k].remove();
      delete bars[k];
    });
    activeBar = null;
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
    const gap = settings.gap;
    const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

    let mode = settings.position;
    // 右側空間不足時，改放在輸入框上方
    if (mode === 'right' && rect.right + gap + w > vw) mode = 'above';

    let left, top;
    if (mode === 'right') {
      left = rect.right + gap;
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

  // ───────────── 側邊欄設定面板 ─────────────
  function el(tag, props, styleText) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    if (styleText) node.style.cssText = styleText;
    return node;
  }

  function renderSettings(tabPane) {
    tabPane.textContent = '';
    const root = el('div', null, 'padding:12px;display:flex;flex-direction:column;gap:14px;font-size:13px;');
    const sectionTitle = (text) => el('div', { textContent: text }, 'font-weight:bold;margin-bottom:4px;');

    root.appendChild(el('div', { textContent: SCRIPT_NAME }, 'font-size:15px;font-weight:bold;'));

    // 位置
    const posBox = el('div');
    posBox.appendChild(sectionTitle('按鈕列位置'));
    const select = el('select', null, 'width:100%;padding:4px;');
    Object.entries(POSITIONS).forEach(([value, text]) => {
      const opt = el('option', { value, textContent: text });
      if (settings.position === value) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      settings.position = select.value;
      saveSettings();
    });
    posBox.appendChild(select);
    posBox.appendChild(
      el('div', { textContent: '若點按鈕時對話框被關閉，或按鈕擋住建議清單，可換位置試試。' }, 'color:#777;margin-top:4px;')
    );
    root.appendChild(posBox);

    // 間距
    const gapBox = el('div');
    gapBox.appendChild(sectionTitle('與輸入框的間距（px，僅「右側」使用）'));
    const gapInput = el('input', { type: 'number', min: 0, max: 200, value: settings.gap }, 'width:100%;padding:4px;');
    gapInput.addEventListener('change', () => {
      const v = parseInt(gapInput.value, 10);
      settings.gap = Number.isFinite(v) ? Math.max(0, Math.min(200, v)) : DEFAULT_SETTINGS.gap;
      gapInput.value = settings.gap;
      saveSettings();
    });
    gapBox.appendChild(gapInput);
    root.appendChild(gapBox);

    // 各輸入框：啟用 + 自訂按鈕
    Object.entries(DEFAULT_LAYOUTS).forEach(([key, layout]) => {
      const box = el('div', null, 'border-top:1px solid #ddd;padding-top:10px;');

      const label = el('label', null, 'display:flex;align-items:center;gap:6px;font-weight:bold;margin-bottom:4px;');
      const cb = el('input', { type: 'checkbox', checked: settings.enabled[key] });
      cb.addEventListener('change', () => {
        settings.enabled[key] = cb.checked;
        saveSettings();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(`${layout.name}：顯示按鈕列`));
      box.appendChild(label);

      box.appendChild(
        el('div', { textContent: '按鈕內容（每行一列，按鈕之間以空白分隔）' }, 'color:#777;margin-bottom:4px;')
      );
      const ta = el('textarea', { rows: Math.min(8, rowsOf(key).length + 1), value: rowsToText(rowsOf(key)) },
        'width:100%;box-sizing:border-box;padding:4px;font-size:14px;');
      ta.addEventListener('change', () => {
        const rows = textToRows(ta.value);
        if (rows.length) settings.rows[key] = rows;
        else delete settings.rows[key];
        saveSettings();
        resetBars();
        ta.value = rowsToText(rowsOf(key));
      });
      box.appendChild(ta);

      const reset = el('button', { type: 'button', textContent: '還原這組預設按鈕' },
        'margin-top:4px;padding:3px 8px;cursor:pointer;');
      reset.addEventListener('click', () => {
        delete settings.rows[key];
        saveSettings();
        resetBars();
        ta.value = rowsToText(rowsOf(key));
      });
      box.appendChild(reset);
      root.appendChild(box);
    });

    // 全部還原
    const resetAll = el('button', { type: 'button', textContent: '全部還原為預設值' },
      'padding:5px 10px;cursor:pointer;align-self:flex-start;');
    resetAll.addEventListener('click', () => {
      settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      saveSettings();
      resetBars();
      renderSettings(tabPane);
    });
    root.appendChild(resetAll);

    tabPane.appendChild(root);
  }

  async function setupSettingsTab(sdk) {
    if (!sdk || !sdk.Sidebar || typeof sdk.Sidebar.registerScriptTab !== 'function') return;
    try {
      const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
      tabLabel.textContent = TAB_LABEL;
      renderSettings(tabPane);
    } catch (err) {
      console.warn(`[${SCRIPT_NAME}] 無法建立設定分頁（不影響按鈕功能）：`, err);
    }
  }

  // ───────────── 啟動流程 ─────────────
  let started = false;

  // 綁定輸入框事件（只會執行一次）
  function start() {
    if (started) return;
    started = true;

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
  }

  // SDK 初始化完成後，登記腳本並等待 WME 就緒（登入且地圖資料載入完成）
  function initWithSdk() {
    let sdk = null;
    try {
      sdk = window.getWmeSdk({
        scriptId: SCRIPT_ID,
        scriptName: SCRIPT_NAME,
        mode: 'async', // 建議的非同步模式
      });
    } catch (err) {
      console.warn(`[${SCRIPT_NAME}] SDK 初始化失敗，改為直接啟動：`, err);
      start();
      return;
    }

    let ready = false;
    const onReady = () => {
      if (ready) return;
      ready = true;
      start();
      setupSettingsTab(sdk);
    };

    // 保險：若 wme-ready 沒有觸發（例如尚未登入），一段時間後仍會啟動
    setTimeout(onReady, READY_TIMEOUT_MS);
    try {
      sdk.Events.once({ eventName: 'wme-ready' }).then(onReady, onReady);
    } catch (err) {
      onReady();
    }
  }

  // 等待 SDK 出現；若 SDK 不存在（例如舊版或載入失敗）則直接啟動，不影響功能
  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.SDK_INITIALIZED && typeof window.SDK_INITIALIZED.then === 'function' && window.getWmeSdk) {
        clearInterval(timer);
        window.SDK_INITIALIZED.then(initWithSdk, start);
      } else if (tries >= SDK_WAIT_TRIES) {
        clearInterval(timer);
        console.warn(`[${SCRIPT_NAME}] 找不到 WME SDK，直接啟動`);
        start();
      }
    }, 250);
  }

  boot();
})();
