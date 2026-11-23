# WME 街道名稱快速輸入

給 **Waze Map Editor（WME）** 使用的 Tampermonkey 腳本。在編輯路段的「街道」欄位時，自動顯示快捷按鈕，點一下就能插入 `路`、`街`、`段`、`巷`、`弄`、`縣道` 與數字、方位字、天干，減少繁體中文路名的打字量。

## 功能

- 點擊下列輸入框時，在輸入框旁彈出對應的快捷按鈕：
  - **街道名稱**（編輯路段的「街道」欄位）
  - **盾牌文字**（「增加街道盾形路牌」對話框）
  - **方向**（盾形路牌的「方向」欄位）
- 插入位置為游標處，輸入框不會失去焦點，可連續點選
- 街道名稱的按鈕，依分類排成六列：
  - 路、街、段、巷、弄
  - 省道、市道、縣道、區道、鄉道
  - 東、西、南、北
  - 國字數字：一～十
  - 天干：甲、乙、丙、丁、戊、己、庚、辛、壬、癸
  - 數字 0～9 與連字號 `-`（例如「12-1」、「178-1縣道」）
- 盾牌文字：數字 0～9、`-`、天干（例如「185甲」）
- 方向：東、西、南、北
- 按鈕內容可自行修改（見下方「自訂」）

## 安裝

1. 瀏覽器安裝 [Tampermonkey](https://www.tampermonkey.net/)
2. 點擊安裝連結：[wme-street-quick-input.user.js](https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js)
3. Tampermonkey 會跳出安裝畫面，按「安裝」
4. 重新整理 WME，選取路段後點擊「街道」欄位即可

## 自訂

編輯腳本中的 `LAYOUTS`，每種輸入框一個版面：`hints` 是用來辨識輸入框的 placeholder 文字，`rows` 的每個子陣列是一列按鈕：

```js
const LAYOUTS = {
  street: {
    hints: ['輸入街道', 'street name', 'enter street'],
    rows: [
      ['路', '街', '段', '巷', '弄'],
      ['省道', '市道', '縣道', '區道', '鄉道'],
      // ...
    ],
  },
  shield: { hints: ['使用數字和字母', 'numbers and letters'], rows: [/* ... */] },
  direction: { hints: ['輸入方向', 'enter direction'], rows: [['東', '西', '南', '北']] },
};
```

## 按鈕列位置

預設顯示在輸入框**右側**，不會擋住下方的路名建議清單。可修改腳本開頭的 `POSITION`（所有版面共用）：

- `'right'`：輸入框右側（預設；右側空間不足時自動改放上方）
- `'above'`：輸入框上方
- `'below'`：輸入框下方（會擋住建議清單）

## 已知限制

- WME 的輸入框使用 Web Component（shadow DOM），腳本依 placeholder（`輸入街道` / `Enter street name`）辨識欄位。若 WME 改版導致按鈕未出現，請調整 `isStreetInput()` 或開 Issue 回報。
- 尚未在各版本 WME 上廣泛測試，歡迎回報結果。

## 回報問題

請至 Issues 回報，並附上：WME 版本、瀏覽器、Tampermonkey 版本，以及 Console 的錯誤訊息。

## 授權

[MIT](LICENSE) © Waze Community Taiwan.
