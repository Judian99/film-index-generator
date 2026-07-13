# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

纯前端网页原型：把扫描后的单张底片图片生成 135 胶片风格索引图（contact sheet）。无构建工具、无依赖、无测试框架——只有三个文件：`index.html`、`app.js`、`styles.css`。

## 运行方式

直接用浏览器打开 `index.html` 即可。没有 build / lint / test 命令。

## 架构

- `app.js` 是一个 IIFE，全部逻辑都在里面。核心数据流：
  1. 用户通过文件选择或拖拽导入图片 → `loadFiles()` 用 `createImageBitmap`（带 `imageOrientation: "from-image"` 处理 EXIF 方向，失败时落回 `<img>` 解码）读取为稳定的 `originalSource`；`rebuildItemSource()` 根据当前画幅/半格输入模式创建派生 `source`，切换模式时 `rebuildAllItemSources()` 从稳定原图重新处理；`readExifDate()` 手动解析 JPEG APP1 段读取拍摄时间
  2. 控件变化触发 `scheduleRender()`（80ms 防抖）→ `render()` → `drawIndex()` 在 canvas 上重新绘制整张索引图
  3. 导出时 `exportIndexImage()` 先用 `computeLayout()` 校验画布尺寸不超过浏览器上限（`MAX_CANVAS_SIDE`/`MAX_CANVAS_AREA`），再临时把 `activeCanvas`/`ctx` 切换到一个离屏 canvas，按导出倍率（1x/2x/3x）重新绘制，`toBlob` 下载，最后切回预览 canvas

- 绘制是分层函数：`drawIndex`（整体布局）→ `drawFilmRow`（每行胶片条：投影、片基渐变、光泽、颗粒/划痕纹理）→ `drawFrame`（画面 + 暗角）/ `drawBlankFrame` / `drawSprockets`（齿孔）/ `drawEdgeTextTop`（型号边字）/ `drawEdgeTextBottom`（帧号边字）

- 上下带按分区排布：外侧边字带（`textH`）+ 内侧齿孔带（`sprocketH`），齿孔带向外缘收紧 `textSprocketShift` 后两者之和为 `bandH`，都在 `getRenderOptions` 中派生。齿孔/边字的比例系数集中在 `TUNE` 常量里，侧栏"高级设置"菜单（默认收起，`setupTunePanel` 渲染进 `#tuneFields`）提供滑块实时调整

- 画布交互（仅预览 canvas）：`drawIndex` 在预览时把每帧的命中区域记录进 `state.frameRects`；pointerdown 命中帧则进入拖拽调序（幽灵缩略图 + `drawDropIndicator` 插入指示线），命中背景则拖拽平移（改 `previewWrap` 的 scrollLeft/Top）。坐标换算要除以 `state.previewZoom`

- 所有绘制尺寸都由 `getRenderOptions(scale)` 从"单张宽度"派生，因此预览和导出共用同一套绘制代码。画幅由集中式 `FORMATS` 表驱动（`frameAspect` 的 option value 是格式 id：`135`/`half`/`645`/`66`/`67`/`69`/`xpan`），`medium` 标记 120 中画幅并锁定每行张数，`portrait` 标记竖幅槽位（645 横图经 `targetPortraitMode()` 自动转竖）。120 在 `getRenderOptions` 中走独立参数分支：所有比例以画幅高 `slotH`（对应真实 56mm）为基准，窄边带（`TUNE.band120`）、小帧间隙（`TUNE.gap120`）、平切端头（`buildStripPath` 极小圆角）、默认无齿孔无片头；边字按帧对齐走 `drawEdgeTextTop120`/`drawEdgeTextBottom120`（型号+帧号+▶箭头+DX 条码刻线，交替字样取 `PROCESS_DEFAULTS[].edgePresets120`）。半格“单张裁切”使用 12 个半宽槽位（片头首行 10 张），条带尺寸对齐标准六格 135；半格“单张未裁切”把每个双格横向扫描文件作为一个 3:2 全幅槽位，恢复 `columnsSelect` 的 4–8 张排版

- 排序：`getSortedItems()` 支持名称 / 时间（优先 EXIF 拍摄时间，退回 mtime）/ 自定义三种模式；画布或照片列表中拖拽都会先 `solidifyCustomOrder()` 固化当前顺序再切到自定义模式

- 胶卷型号是独立对象（`{ id, name, edgeText, process, edgeInk?, edgePresets?, frameNumberStyle?, builtin }`）：内置型号在 `BUILTIN_STOCKS`，自定义型号存 `state.customStocks` 并持久化到 localStorage（`filmIndex.customStocks` / `filmIndex.selectedStock`）。工艺 `process` 四档（C-41 / BW / E-6 / ECN-2），每档默认外观在 `PROCESS_DEFAULTS`；型号省略的外观字段由 `resolveStock()` 落回工艺默认，渲染层只消费合并结果（`options.stock`）。`edgeText` 为空字符串表示底片无边字：只跳过边字绘制，边字带 `textH` 仍照常占位，布局与有边字时一致。侧栏「自定义型号」面板（`setupStockPanel`）提供表单增删改 + JSON 导入导出；外部数据（localStorage / 导入）一律经 `sanitizeStock()` 校验，非法条目丢弃

- 关键约定：
  - 图片对象以 `item.originalSource` 保存稳定的 EXIF 校正原图，`item.editSource` 保存用户裁切基线，`item.source` 是当前模式派生的渲染源；绘制尺寸统一读 `item.width`/`item.height`，不要用 `naturalWidth`
  - 自动方向旋转与用户显式旋转分离：模式重建不能累计旋转，异步结果必须用 `state.reprocessGeneration` / `item.editVersion` 防止旧任务覆盖新状态
  - 移除图片时必须走 `releaseItem()`（按身份去重关闭 original/edit/render ImageBitmap、revoke 缩略图 objectURL），避免内存泄漏
  - 噪点用 `deterministicNoise()`（sin 伪随机），保证预览和导出结果一致，不要换成 `Math.random()`
  - 预览缩放只改 canvas 的 CSS 尺寸（`applyPreviewZoom`），不影响绘制分辨率
  - `document` 级别的 dragover/drop 已 `preventDefault`，防止拖拽错位时浏览器跳转丢失页面；`fileInput.value` 在每次导入后重置以支持重复选择同一文件

- 图片只在浏览器本地处理，不上传、不写入元数据。边字目前是模拟效果，README 中提到后续计划改为真实胶片边字素材驱动的渲染。

## 语言

UI 文案和 README 均为简体中文，新增用户可见文案保持中文。
