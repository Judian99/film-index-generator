/**
 * gsap-ui.js — 暗房主题 GSAP 动画层
 *
 * 动效节奏与 styles.css 的 token 保持一致：
 *   micro 0.12s / standard 0.22s / emphasis 0.36s / scene 0.65s
 *
 * 功能模块：
 *  1. 启动序列     — 安全灯点亮品牌区 → 面板 stagger → 工作区灯箱浮现
 *  2. 面板高度动画 — details 展开/收起平滑过渡 + 子项 stagger
 *  3. 按钮物理     — 点按压缩 + elastic 弹回
 *  4. 照片列表     — 新增项 slide-in
 *  5. Toast 通知   — spring 弹出 / 收回
 *  6. 模态框       — scale+fade 弹入，拦截关闭执行退出动画
 *  7. 右键菜单     — back.out 弹入
 *  8. 拖放区域     — drag-enter 脉冲放大
 *  9. 观片台过场   — 黑场幕布转场 + HUD 滑入
 * 10. 缩放气泡     — 拖动缩放滑块时显示实时数值
 */
(function () {
  'use strict';

  // 首要动作：解除 CSS 首帧预隐藏（anim-boot）。
  // 之后无论 GSAP 是否可用、是否减少动态，页面都能静态呈现，不会元素失踪。
  document.documentElement.classList.remove('anim-boot');

  if (typeof gsap === 'undefined') {
    console.warn('[gsap-ui] GSAP 未加载，动画层未启用');
    return;
  }

  // 尊重系统"减少动态"偏好：整个动画层不启用，交回 CSS 瞬时态
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var EASE_OUT = 'power3.out';
  var EASE_SCENE = 'power2.inOut';

  gsap.defaults({ ease: EASE_OUT });

  /* ───────────────────────────────────────────────────────────────────────
   * 1. 启动序列 —— 暗房开灯
   *
   * CSS 的 .anim-boot 已在首帧前隐藏各元素；这里先 set 同一初态无缝接管，
   * 再用 to() 依次点亮，避免"渲染→隐→现"的闪黑。
   * ─────────────────────────────────────────────────────────────────────*/
  function initBoot() {
    gsap.set('.brand-mark', { opacity: 0, scale: 0.55 });
    gsap.set('.brand-copy', { opacity: 0, x: -16 });
    gsap.set('.workflow-panel', { opacity: 0, y: 24 });
    gsap.set('.topbar', { opacity: 0, y: -18 });
    gsap.set('.preview-wrap', { opacity: 0, y: 16, filter: 'brightness(1.5)' });

    var tl = gsap.timeline({ delay: 0.05 });

    // 安全灯点亮：logo 从过曝辉光沉降下来
    tl.to('.brand-mark', {
      opacity: 1,
      scale: 1,
      filter: 'brightness(1) blur(0px)',
      duration: 0.72,
      ease: 'power2.out',
      clearProps: 'filter',
    })
      .to('.brand-copy', { x: 0, opacity: 1, duration: 0.42 }, '-=0.4')
      .to('.workflow-panel', {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.09,
        ease: 'power2.out',
      }, '-=0.24')
      .to('.topbar', { y: 0, opacity: 1, duration: 0.44 }, '<')
      // 灯箱预热：预览区带一点亮度闪落
      .to('.preview-wrap', {
        opacity: 1,
        y: 0,
        filter: 'brightness(1)',
        duration: 0.62,
        ease: 'power2.out',
        clearProps: 'filter,transform,opacity',
      }, '-=0.36');
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 2. details 面板高度动画 + 子项 stagger
   *
   * <details> 原生不支持过渡；这里拦截 summary 点击，
   * 用"临时翻转 open 测量收起高度"的方式做精确的高度补间。
   * ─────────────────────────────────────────────────────────────────────*/
  function measureCollapsedHeight(panel) {
    var wasOpen = panel.open;
    panel.open = false;
    var h = panel.offsetHeight;
    panel.open = wasOpen;
    return h;
  }

  function initPanelMotion() {
    document
      .querySelectorAll('details.advanced-panel, details.photo-list-section, details.stock-advanced')
      .forEach(function (panel) {
        var summary = panel.querySelector('summary');
        if (!summary) return;

        summary.addEventListener('click', function (e) {
          e.preventDefault();
          gsap.killTweensOf(panel);

          if (panel.open) {
            // 收起：当前高度 → 折叠高度
            var collapsed = measureCollapsedHeight(panel);
            panel.style.overflow = 'hidden';
            gsap.to(panel, {
              height: collapsed,
              duration: 0.32,
              ease: 'power2.inOut',
              onComplete: function () {
                panel.open = false;
                panel.style.height = '';
                panel.style.overflow = '';
              },
            });
          } else {
            // 展开：折叠高度 → 自然高度，随后子项 stagger 滑入
            var collapsedH = panel.offsetHeight;
            panel.open = true;
            panel.style.overflow = 'hidden';
            var expandedH = panel.scrollHeight;
            gsap.fromTo(
              panel,
              { height: collapsedH },
              {
                height: expandedH,
                duration: 0.38,
                ease: 'power3.out',
                onComplete: function () {
                  panel.style.height = '';
                  panel.style.overflow = '';
                  var items = panel.querySelectorAll('.panel-section, .drop-zone, .field, .hint');
                  if (items.length) {
                    gsap.from(items, {
                      y: 10,
                      opacity: 0,
                      duration: 0.3,
                      stagger: 0.045,
                      ease: 'power2.out',
                      clearProps: 'all',
                    });
                  }
                },
              }
            );
          }
        });
      });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 3. 按钮弹性物理
   * ─────────────────────────────────────────────────────────────────────*/
  function initButtons() {
    var SEL = '.primary-button, .icon-button, .text-button';

    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest(SEL);
      if (!btn || btn.disabled) return;
      gsap.to(btn, {
        scale: 0.92,
        y: 1,
        duration: 0.1,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    function release(e) {
      var btn = e.target.closest(SEL);
      if (!btn || btn.disabled) return;
      gsap.to(btn, {
        scale: 1,
        y: 0,
        duration: 0.55,
        ease: 'elastic.out(1.05, 0.42)',
        overwrite: 'auto',
      });
    }

    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 4. 照片列表 — 新增项 slide-in（骨架行不参与）
   * ─────────────────────────────────────────────────────────────────────*/
  function initPhotoList() {
    var list = document.getElementById('photoList');
    if (!list) return;

    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1 || !node.classList.contains('photo-item')) return;
          gsap.from(node, {
            x: -22,
            opacity: 0,
            duration: 0.36,
            ease: 'back.out(1.5)',
            clearProps: 'all',
          });
        });
      });
    }).observe(list, { childList: true });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 5. Toast 通知 — 接管 CSS transition，改用 GSAP spring
   * ─────────────────────────────────────────────────────────────────────*/
  function initNotice() {
    var el = document.getElementById('notice');
    if (!el) return;

    el.style.transition = 'none';
    gsap.set(el, { xPercent: -50, y: 14, opacity: 0, force3D: true });

    new MutationObserver(function () {
      gsap.killTweensOf(el);
      if (el.classList.contains('is-visible')) {
        gsap.to(el, {
          y: 0,
          opacity: 1,
          xPercent: -50,
          duration: 0.44,
          ease: 'back.out(1.6)',
        });
      } else {
        gsap.to(el, {
          y: 14,
          opacity: 0,
          xPercent: -50,
          duration: 0.24,
          ease: 'power2.in',
        });
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 6. 模态框动画（裁切 / 单帧导出 / 整图导出）
   * ─────────────────────────────────────────────────────────────────────*/
  function animateModal(cfg) {
    var modal = document.getElementById(cfg.modalId);
    if (!modal) return;

    var closing = false;

    new MutationObserver(function () {
      if (closing) return;

      var bd = modal.querySelector(cfg.backdropSel);
      var ct = modal.querySelector(cfg.containerSel);

      if (!modal.hidden) {
        gsap.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.28 });
        gsap.fromTo(
          ct,
          { opacity: 0, scale: 0.88, y: 28 },
          { opacity: 1, scale: 1, y: 0, duration: 0.46, ease: 'back.out(1.45)' }
        );
      } else {
        closing = true;
        modal.hidden = false;

        gsap.to(bd, { opacity: 0, duration: 0.22 });
        gsap.to(ct, {
          opacity: 0,
          scale: 0.92,
          y: 18,
          duration: 0.26,
          ease: 'power2.in',
          onComplete: function () {
            modal.hidden = true;
            gsap.set([bd, ct], { clearProps: 'all' });
            requestAnimationFrame(function () { closing = false; });
          },
        });
      }
    }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 7. 右键帧菜单 — back.out 弹入
   * ─────────────────────────────────────────────────────────────────────*/
  function initContextMenu() {
    var menu = document.getElementById('frameMenu');
    if (!menu) return;

    new MutationObserver(function () {
      if (!menu.hidden) {
        gsap.fromTo(
          menu,
          { opacity: 0, scale: 0.82, transformOrigin: 'top left' },
          { opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(1.8)' }
        );
      }
    }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 8. 拖放区域 — drag-enter 脉冲放大
   * ─────────────────────────────────────────────────────────────────────*/
  function initDropZone() {
    var dz = document.getElementById('dropZone');
    if (!dz) return;

    dz.addEventListener('dragenter', function () {
      gsap.to(dz, { scale: 1.03, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    });

    function resetDz() {
      gsap.to(dz, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.42)', overwrite: 'auto' });
    }

    dz.addEventListener('dragleave', resetDz);
    dz.addEventListener('drop', resetDz);
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 9. 观片台场景过场
   *
   * 常规模式与观片台同为暗色系，用黑场幕布做"关灯→开灯箱"的剪辑感转场：
   *   进入：幕布压黑（此时 CSS 已瞬时切换布局）→ 幕布揭开 + HUD 滑入
   *   退出：幕布压黑 → 揭开恢复工作台
   * ─────────────────────────────────────────────────────────────────────*/
  function getSceneVeil() {
    var veil = document.getElementById('sceneVeil');
    if (!veil) {
      veil = document.createElement('div');
      veil.id = 'sceneVeil';
      veil.setAttribute('aria-hidden', 'true');
      document.body.appendChild(veil);
    }
    return veil;
  }

  function initLightTableTransition() {
    var body = document.body;
    var hud = document.getElementById('lightTableHud');
    if (!hud) return;
    var veil = getSceneVeil();

    var prevIsLt = false;

    new MutationObserver(function () {
      var isLt = body.classList.contains('is-light-table');
      if (isLt === prevIsLt) return;
      prevIsLt = isLt;

      gsap.killTweensOf([veil, hud]);

      if (isLt) {
        // 进入：压黑 → 揭幕，观片台 HUD 随光亮起
        gsap.timeline()
          .to(veil, { opacity: 1, duration: 0.26, ease: 'power2.in' })
          .to(veil, { opacity: 0, duration: 0.48, ease: 'power2.out' })
          .fromTo(
            hud,
            { y: -16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' },
            '-=0.34'
          );
      } else {
        // 退出：压黑 → 回到工作台
        gsap.timeline()
          .to(hud, { opacity: 0, duration: 0.12, ease: 'power1.in' })
          .to(veil, { opacity: 1, duration: 0.2, ease: 'power2.in' })
          .to(veil, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: function () {
              gsap.set(hud, { clearProps: 'opacity,transform' });
            },
          });
      }
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * 10. 缩放滑轨实时数值气泡（样式见 styles.css 的 #zoomBubble）
   * ─────────────────────────────────────────────────────────────────────*/
  function initZoomBubble() {
    var range = document.getElementById('zoomRange');
    var wrap = document.querySelector('.zoom-field');
    if (!range || !wrap) return;

    var bubble = document.createElement('span');
    bubble.id = 'zoomBubble';
    bubble.setAttribute('aria-hidden', 'true');
    wrap.appendChild(bubble);

    var hideTimer = null;

    function updateBubble() {
      var pct = ((range.value - range.min) / (range.max - range.min)) * 100;
      bubble.style.left = pct + '%';
      bubble.textContent = range.value + '%';

      clearTimeout(hideTimer);
      gsap.killTweensOf(bubble);
      gsap.to(bubble, {
        opacity: 1,
        scale: 1,
        duration: 0.16,
        ease: 'back.out(2)',
        overwrite: true,
      });

      hideTimer = setTimeout(function () {
        gsap.to(bubble, {
          opacity: 0,
          scale: 0.75,
          duration: 0.18,
          ease: 'power2.in',
          overwrite: true,
        });
      }, 900);
    }

    range.addEventListener('input', updateBubble);
    range.addEventListener('keydown', function () {
      requestAnimationFrame(updateBubble);
    });
  }

  /* ───────────────────────────────────────────────────────────────────────
   * INIT
   * ─────────────────────────────────────────────────────────────────────*/
  initBoot();
  initPanelMotion();
  initButtons();
  initPhotoList();
  initNotice();

  animateModal({
    modalId: 'exportModal',
    backdropSel: '.frame-export-backdrop',
    containerSel: '.frame-export-container',
  });
  animateModal({
    modalId: 'frameExportModal',
    backdropSel: '.frame-export-backdrop',
    containerSel: '.frame-export-container',
  });
  animateModal({
    modalId: 'cropModal',
    backdropSel: '.crop-backdrop',
    containerSel: '.crop-container',
  });

  initContextMenu();
  initDropZone();
  initZoomBubble();
  initLightTableTransition();
})();
