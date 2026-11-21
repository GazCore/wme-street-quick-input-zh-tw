# WME 街道名稱快速輸入

給 **Waze Map Editor（WME）** 使用的 Tampermonkey 腳本。在編輯路段的「街道」欄位時，自動顯示快捷按鈕，點一下就能插入 `路`、`段`、`街`、`巷`、`弄`、`號` 與數字、方位字，減少繁體中文路名的打字量。

## 功能

- 點擊「街道」欄位時，在輸入框旁彈出快捷按鈕列
- 插入位置為游標處，輸入框不會失去焦點，可連續點選
- 預設按鈕：
  - 路、街、大道、段、巷、弄、號、之
  - 東、西、南、北、一～十
  - 市道、縣道、區道、鄉道
  - 數字 0～9 與連字號 `-`（例如門牌「12-1」、「縣道185-1」）
- 按鈕內容可自行修改（見下方「自訂」）

## 安裝

1. 瀏覽器安裝 [Tampermonkey](https://www.tampermonkey.net/)
2. 點擊安裝連結：[wme-street-quick-input.user.js](https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js)
3. Tampermonkey 會跳出安裝畫面，按「安裝」
4. 重新整理 WME，選取路段後點擊「街道」欄位即可

## 自訂

編輯腳本開頭的 `ROWS` 陣列，每個子陣列是一列按鈕：

```js
const ROWS = [
  ['路', '街', '大道', '段', '巷', '弄', '號', '之'],
  ['東', '西', '南', '北', '一', '二', '三', '四', '五'],
  ['六', '七', '八', '九', '十', '市道', '縣道', '區道', '鄉道'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
];
```

## 按鈕列位置

預設顯示在輸入框**右側**，不會擋住下方的路名建議清單。可修改腳本開頭的 `POSITION`：

- `'right'`：輸入框右側（預設；右側空間不足時自動改放上方）
- `'above'`：輸入框上方
- `'below'`：輸入框下方（會擋住建議清單）

## 已知限制

- WME 的輸入框使用 Web Component（shadow DOM），腳本依 placeholder（`輸入街道` / `Enter street name`）辨識欄位。若 WME 改版導致按鈕未出現，請調整 `isStreetInput()` 或開 Issue 回報。
- 尚未在各版本 WME 上廣泛測試，歡迎回報結果。

## 回報問題

請至 Issues 回報，並附上：WME 版本、瀏覽器、Tampermonkey 版本，以及 Console 的錯誤訊息。

## 授權

[MIT](LICENSE)
