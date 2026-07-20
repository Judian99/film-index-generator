# Three.js 片基 PBR Demo

独立的单帧真实 3D 视觉实验，不接入正式应用，也不包含导出功能。

## 运行

必须通过本地 HTTP 打开。请在仓库根目录执行：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000/docs/demos/single-frame-three-pbr/
```

直接使用 `file://` 双击打开时，ES Module 可能被浏览器的同源策略阻止。页面设计为在可执行的情况下显示 Canvas 2D 回退，但推荐始终使用本地 HTTP。

## 渲染模式

- 默认：Three.js WebGL2 PBR
- 强制回退：在 URL 后添加 `?renderer=canvas2d`
- WebGL2 初始化失败或上下文丢失时，自动切换现有 Canvas 2D 单帧 renderer

## 本地依赖

- Three.js `0.176.0` / `r176`
- 来源：官方 npm 包 `three@0.176.0`
- 运行时不连接 CDN，不加载外部纹理、HDR 或字体
- 版本、`three.module.js` / `three.core.js` 的 SHA-256 和 MIT 许可证位于 `vendor/`

## 范围

支持 135、半格裁切/完整扫描、XPan、135 超宽幅，以及 120 的 645、6×6、6×7、6×9、6×12、6×17。图片只在浏览器本地读取。
