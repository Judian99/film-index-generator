# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

纯前端网页原型：把扫描后的单张底片图片生成 135 胶片风格索引图（contact sheet）。无构建工具、无依赖、无测试框架——只有三个文件：`index.html`、`app.js`、`styles.css`。

## 运行方式

直接用浏览器打开 `index.html` 即可。没有 build / lint / test 命令。

## 架构

- `app.js` 是一个 IIFE，全部逻辑都在里面。核心数据流：
  1. 用户通过文件选择或拖拽导入图片 → `loadFiles()` 用 `createImageBitmap`（带 `imageOrientation: "from-image"` 处理 EXIF 方向，失败时落回 `<img>` 解码）读取，竖图经 `normalizeOrientation()` 统一顺时针旋转 90 度后追加进 `state.items`；`readExifDate()` 手动解析 JPEG APP1 段读取拍摄时间
  2. 控件变化触发 `scheduleRender()`（80ms 防抖）→ `render()` → `drawIndex()` 在 canvas 上重新绘制整张索引图
  3. 导出时 `exportIndexImage()` 先用 `computeLayout()` 校验画布尺寸不超过浏览器上限（`MAX_CANVAS_SIDE`/`MAX_CANVAS_AREA`），再临时把 `activeCanvas`/`ctx` 切换到一个离屏 canvas，按导出倍率（1x/2x/3x）重新绘制，`toBlob` 下载，最后切回预览 canvas

- 绘制是分层函数：`drawIndex`（整体布局）→ `drawFilmRow`（每行胶片条：投影、片基渐变、光泽、颗粒/划痕纹理）→ `drawFrame`（画面 + 暗角）/ `drawBlankFrame` / `drawSprockets`（齿孔）/ `drawEdgeTextTop`（型号边字）/ `drawEdgeTextBottom`（帧号边字）

- 上下带按分区排布：外侧边字带（`textH`）+ 内侧齿孔带（`sprocketH`），齿孔带向外缘收紧 `textSprocketShift` 后两者之和为 `bandH`，都在 `getRenderOptions` 中派生。齿孔/边字的比例系数集中在 `TUNE` 常量里，侧栏"高级设置"菜单（默认收起，`setupTunePanel` 渲染进 `#tuneFields`）提供滑块实时调整

- 画布交互（仅预览 canvas）：`drawIndex` 在预览时把每帧的命中区域记录进 `state.frameRects`；pointerdown 命中帧则进入拖拽调序（幽灵缩略图 + `drawDropIndicator` 插入指示线），命中背景则拖拽平移（改 `previewWrap` 的 scrollLeft/Top）。坐标换算要除以 `state.previewZoom`

- 所有绘制尺寸都由 `getRenderOptions(scale)` 从"单张宽度"派生（比例系数硬编码在该函数中），因此预览和导出共用同一套绘制代码，只是 scale 不同；列数和画幅比例也来自这里（`columnsSelect`/`frameAspect` 控件）

- 排序：`getSortedItems()` 支持名称 / 时间（优先 EXIF 拍摄时间，退回 mtime）/ 自定义三种模式；画布或照片列表中拖拽都会先 `solidifyCustomOrder()` 固化当前顺序再切到自定义模式

- 胶卷型号是独立对象（`{ id, name, edgeText, process, edgeInk?, edgePresets?, frameNumberStyle?, builtin }`）：内置型号在 `BUILTIN_STOCKS`，自定义型号存 `state.customStocks` 并持久化到 localStorage（`filmIndex.customStocks` / `filmIndex.selectedStock`）。工艺 `process` 四档（C-41 / BW / E-6 / ECN-2），每档默认外观在 `PROCESS_DEFAULTS`；型号省略的外观字段由 `resolveStock()` 落回工艺默认，渲染层只消费合并结果（`options.stock`）。`edgeText` 为空字符串表示底片无边字：只跳过边字绘制，边字带 `textH` 仍照常占位，布局与有边字时一致。侧栏「自定义型号」面板（`setupStockPanel`）提供表单增删改 + JSON 导入导出；外部数据（localStorage / 导入）一律经 `sanitizeStock()` 校验，非法条目丢弃

- 关键约定：
  - 图片对象存 `item.source`（ImageBitmap 或 Image），尺寸统一读 `item.width`/`item.height`，不要用 `naturalWidth`
  - 移除图片时必须走 `releaseItem()`（关闭 ImageBitmap、revoke 缩略图 objectURL），避免内存泄漏
  - 噪点用 `deterministicNoise()`（sin 伪随机），保证预览和导出结果一致，不要换成 `Math.random()`
  - 预览缩放只改 canvas 的 CSS 尺寸（`applyPreviewZoom`），不影响绘制分辨率
  - `document` 级别的 dragover/drop 已 `preventDefault`，防止拖拽错位时浏览器跳转丢失页面；`fileInput.value` 在每次导入后重置以支持重复选择同一文件

- 图片只在浏览器本地处理，不上传、不写入元数据。边字目前是模拟效果，README 中提到后续计划改为真实胶片边字素材驱动的渲染。

## 语言

UI 文案和 README 均为简体中文，新增用户可见文案保持中文。
