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
  - 市道、縣道、區道、鄉道
  - 東、西、南、北
  - 國字數字：一～十
  - 天干：甲、乙、丙、丁、戊、己、庚、辛、壬、癸
  - 數字 0～9 與連字號 `-`（例如「12-1」、「178-1縣道」）
- 盾牌文字：數字 0～9、`-`、天干（例如「185甲」）
- 方向：東、西、南、北
- 位置、各輸入框開關與按鈕內容都可在側邊欄設定（見下方「設定」）

## 安裝

1. 瀏覽器安裝 [Tampermonkey](https://www.tampermonkey.net/)
2. 點擊安裝連結：[wme-street-quick-input.user.js](https://raw.githubusercontent.com/GazCore/wme-street-quick-input-zh-tw/main/wme-street-quick-input.user.js)
3. Tampermonkey 會跳出安裝畫面，按「安裝」
4. 重新整理 WME，選取路段後點擊「街道」欄位即可

## 設定

WME 載入完成後，左側「Scripts」區會多一個**「街道文字快輸」**分頁，可在介面上調整，設定會存在瀏覽器的 localStorage：

- **按鈕列位置**：輸入框右側（預設）、上方、下方。右側空間不足時會自動改放上方
- **與輸入框的間距**：僅「右側」使用，預設 24px
- **各輸入框的開關**：街道名稱、盾牌文字、方向，可個別停用
- **自訂按鈕內容**：每行一列，按鈕之間以空白分隔，離開輸入框後自動儲存並套用
- **還原預設**：可還原單一組按鈕，或全部還原

若點按鈕時對話框被關閉，或按鈕擋住路名建議清單，可先換位置試試。

## WME SDK

腳本啟動時會等待 `window.SDK_INITIALIZED`，並以 `getWmeSdk({ mode: 'async' })` 登記（scriptId：`wme-street-quick-input-zh-tw`），再等 `wme-ready` 事件後才綁定輸入框事件，並以 `Sidebar.registerScriptTab` 建立設定分頁。若找不到 SDK，會自動改為直接啟動（此時沒有設定分頁，使用預設值）。

腳本本身只透過 DOM 在輸入框旁加按鈕，不修改 WME 資料模型，所以沒有使用 `DataModel` 等模組。

## 已知限制

- WME 的輸入框使用 Web Component（shadow DOM），腳本依 placeholder（例如 `輸入街道`、`Enter street name`）辨識欄位。若 WME 改版導致按鈕未出現，請在腳本的 `DEFAULT_LAYOUTS` 中調整各版面的 `hints`，或開 Issue 回報。
- 尚未在各版本 WME 上廣泛測試，歡迎回報結果。

## 回報問題

請至 Issues 回報，並附上：WME 版本、瀏覽器、Tampermonkey 版本，以及 Console 的錯誤訊息。

## 授權

[MIT](LICENSE)
