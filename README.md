# 怒海雄鷹（skyhawk）

手機網頁 3D 戰機遊戲：F/A-18E、航母彈射與攔阻著艦、第一關「峽谷突襲」（峽谷低飛、俯衝投彈、躲防空飛彈、海岸空戰、返航著艦）。

**直接玩**：https://wayuanzi-web.github.io/skyhawk/ （手機橫拿；選單可切「體感（傾斜手機）」操控）

- `index.html`：整個遊戲（Three.js r160，從 jsDelivr 載入），模型讀 `assets/fa18e.glb`。
- `tools/build_aircraft.py` + `tools/fa18e.json`：參數式建模（Blender Python 模組，無介面）→ glTF、四層細節、meshopt＋WebP 壓縮。
  `python3 tools/build_aircraft.py tools/fa18e.json assets/fa18e.glb`
- `build.py`：把模型內嵌成單一檔 `dist/index.html`（給不能放 .glb 的地方用）。
- `test/`：無頭瀏覽器測試（Playwright）：飛行性能黃金數值、著艦、觸控、版面、戰鬥平衡、整關腳本飛行員、截圖。

機型與飛行性能取自公開資料；任務、航母舷號、塗裝標誌皆為虛構。
