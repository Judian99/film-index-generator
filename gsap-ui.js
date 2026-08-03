/**
 * gsap-ui.js — GSAP 动画层 for 胶带索引图 FILM
 *
 * 功能模块：
 *  1. 启动序列   — 侧栏、工作区错位淡入
 *  2. 面板展开   — details 子项 stagger 滑入
 *  3. 按钮物理   — 点按压缩 + elastic 弹回
 *  4. 照片列表   — 新增项 slide-in
 *  5. Toast 通知 — spring 弹出 / 收回
 *  6. 模态框     — scale+fade 弹入，拦截关闭执行退出动画
 *  7. 右键菜单   — back.out 弹入
 *  8. 拖放区域   — drag-enter 脉冲放大
 */
(function () {
  'use strict';

  if (typeof gsap === 'undefined') {
    console.warn('[gsap-ui] GSAP 未加载');
    return;
  }

  // 尊重用户的"减少动画"系统偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.defaults({ ease: 'power3.out' });

  /* ─────────────────────────────────────────────────────────────────────────
   * 1. 启动序列
   * ───────────────────────────────────────────────────────────────────────*/
  function initBoot() {
    var tl = gsap.timeline({ delay: 0.05 });

    tl.from('.brand-mark', {
      scale: 0.5,
      rotation: -20,
      opacity: 0,
      duration: 0.7,
      ease: 'back.out(1.8)',
    })
      .from('.brand-copy', { x: -18, opacity: 0, duration: 0.45 }, '-=0.38')
      .from('.workflow-panel', {
        y: 26,
        opacity: 0,
        duration: 0.52,
        stagger: 0.1,
        ease: 'power2.out',
      }, '-=0.28')
      .from('.topbar', { y: -20, opacity: 0, duration: 0.45 }, '<')
      .from('.preview-wrap', {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: 'power2.out',
      }, '-=0.38');
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 2. details 面板展开 — 子项 stagger 滑入
   * ───────────────────────────────────────────────────────────────────────*/
  function initPanels() {
    document.querySelectorAll('details.advanced-panel').forEach(function (panel) {
      panel.addEventListener('toggle', function () {
        if (!panel.open) return;
        var items = panel.querySelectorAll('.panel-section, .drop-zone');
        if (!items.length) return;
        gsap.from(items, {
          y: 12,
          opacity: 0,
          duration: 0.34,
          stagger: 0.055,
          ease: 'power2.out',
          clearProps: 'all',
        });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 3. 按钮弹性物理
   * ───────────────────────────────────────────────────────────────────────*/
  function initButtons() {
    var SEL = '.primary-button, .icon-button, .text-button';

    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest(SEL);
      if (!btn || btn.disabled) return;
      gsap.to(btn, {
        scale: 0.91,
        duration: 0.1,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    function release(e) {
      var btn = e.target.closest(SEL);
      if (!btn) return;
      gsap.to(btn, {
        scale: 1,
        duration: 0.62,
        ease: 'elastic.out(1.1, 0.38)',
        overwrite: 'auto',
      });
    }

    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 4. 照片列表 — 新增项 slide-in
   * ───────────────────────────────────────────────────────────────────────*/
  function initPhotoList() {
    var list = document.getElementById('photoList');
    if (!list) return;

    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1 || !node.classList.contains('photo-item')) return;
          gsap.from(node, {
            x: -24,
            opacity: 0,
            duration: 0.38,
            ease: 'back.out(1.5)',
            clearProps: 'all',
          });
        });
      });
    }).observe(list, { childList: true });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 5. Toast 通知 — 接管 CSS transition，改用 GSAP spring
   * ───────────────────────────────────────────────────────────────────────*/
  function initNotice() {
    var el = document.getElementById('notice');
    if (!el) return;

    // 禁用 CSS transition，GSAP 全权接管
    el.style.transition = 'none';
    // xPercent: -50 保持 left:50% 的水平居中偏移
    gsap.set(el, { xPercent: -50, y: 14, opacity: 0, force3D: true });

    new MutationObserver(function () {
      gsap.killTweensOf(el);
      if (el.classList.contains('is-visible')) {
        gsap.to(el, {
          y: 0,
          opacity: 1,
          xPercent: -50,
          duration: 0.46,
          ease: 'back.out(1.6)',
        });
      } else {
        gsap.to(el, {
          y: 16,
          opacity: 0,
          xPercent: -50,
          duration: 0.26,
          ease: 'power2.in',
        });
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 6. 模态框动画
   *
   * 打开：backdrop + container 弹入
   * 关闭：拦截 hidden=true → 先播退出动画 → 再真正隐藏
   * ───────────────────────────────────────────────────────────────────────*/
  function animateModal(cfg) {
    var modal = document.getElementById(cfg.modalId);
    if (!modal) return;

    var closing = false;

    new MutationObserver(function () {
      if (closing) return;

      var bd = modal.querySelector(cfg.backdropSel);
      var ct = modal.querySelector(cfg.containerSel);

      if (!modal.hidden) {
        // ── 打开动画 ──
        gsap.fromTo(bd,
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        );
        gsap.fromTo(ct,
          { opacity: 0, scale: 0.85, y: 32 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.45)' }
        );
      } else {
        // ── 退出动画：拦截隐藏，先播动画 ──
        closing = true;
        modal.hidden = false; // 临时重新显示以便动画可见

        gsap.to(bd, { opacity: 0, duration: 0.24 });
        gsap.to(ct, {
          opacity: 0,
          scale: 0.9,
          y: 22,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: function () {
            closing = true;
            modal.hidden = true;
            gsap.set([bd, ct], { clearProps: 'all' });
            requestAnimationFrame(function () { closing = false; });
          },
        });
      }
    }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 7. 右键帧菜单 — back.out 弹入
   * ───────────────────────────────────────────────────────────────────────*/
  function initContextMenu() {
    var menu = document.getElementById('frameMenu');
    if (!menu) return;

    new MutationObserver(function () {
      if (!menu.hidden) {
        gsap.fromTo(menu,
          { opacity: 0, scale: 0.78, transformOrigin: 'top left' },
          { opacity: 1, scale: 1, duration: 0.27, ease: 'back.out(1.9)' }
        );
      }
    }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 8. 拖放区域 — drag-enter 脉冲放大
   * ───────────────────────────────────────────────────────────────────────*/
  function initDropZone() {
    var dz = document.getElementById('dropZone');
    if (!dz) return;

    dz.addEventListener('dragenter', function () {
      gsap.to(dz, { scale: 1.032, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    });

    function resetDz() {
      gsap.to(dz, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    }

    dz.addEventListener('dragleave', resetDz);
    dz.addEventListener('drop', resetDz);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * INIT
   * ───────────────────────────────────────────────────────────────────────*/
  initBoot();
  initPanels();
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

}());
