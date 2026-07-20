(() => {
  const root = document.documentElement;
  const app = document.querySelector(".concept-app");
  const stateButtons = [...document.querySelectorAll("[data-demo-state]")];
  const themeButtons = [...document.querySelectorAll("[data-theme-toggle]")];
  const range = document.querySelector("[data-zoom-range]");
  const zoomValue = document.querySelector("[data-zoom-value]");
  const contactSheet = document.querySelector(".contact-sheet");
  const toast = document.querySelector("[data-demo-toast]");
  const storageKey = window.filmIndexTheme?.storageKey || "filmIndex.uiLayoutTheme";
  let toastTimer = 0;

  function showToast(message, kind = "info") {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => { toast.hidden = true; }, 180);
    }, 2200);
  }

  function updateThemeButtons() {
    const dark = root.dataset.theme === "dark";
    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "切换到日间模式" : "切换到夜间模式");
      button.title = dark ? "切换到日间模式" : "切换到夜间模式";
      const label = button.querySelector("[data-theme-label]");
      const icon = button.querySelector("[data-theme-icon]");
      if (label) label.textContent = dark ? "日间" : "夜间";
      if (icon) icon.textContent = dark ? "☀" : "☾";
    });
  }

  function setTheme(theme, persist = true) {
    root.dataset.theme = theme === "dark" ? "dark" : "light";
    if (persist) {
      try { localStorage.setItem(storageKey, root.dataset.theme); } catch {
        showToast("主题已切换，但浏览器未允许保存偏好", "warning");
      }
    }
    updateThemeButtons();
  }

  function setState(state, announce = false) {
    if (!app) return;
    const next = state === "empty" ? "empty" : "working";
    app.dataset.state = next;
    stateButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.demoState === next));
    });
    if (announce) showToast(next === "empty" ? "已切换到空状态" : "已切换到工作状态");
  }

  function setZoom(value) {
    if (!contactSheet) return;
    const zoom = Number(value) / 100;
    contactSheet.style.transform = `scale(${zoom})`;
    contactSheet.style.transformOrigin = "center";
    if (zoomValue) zoomValue.textContent = `${value}%`;
  }

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next);
      showToast(`已切换到${next === "dark" ? "夜间" : "日间"}模式`, "success");
    });
  });

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => setState(button.dataset.demoState, true));
  });

  if (range) range.addEventListener("input", () => setZoom(range.value));

  document.querySelectorAll("[data-zoom-step]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!range) return;
      const next = Math.max(Number(range.min), Math.min(Number(range.max), Number(range.value) + Number(button.dataset.zoomStep)));
      range.value = String(next);
      setZoom(next);
    });
  });

  document.querySelectorAll("[data-fit]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!range) return;
      range.value = "75";
      setZoom(75);
      showToast("预览已适合当前窗口");
    });
  });

  document.querySelectorAll("[data-fake-import]").forEach((button) => {
    button.addEventListener("click", () => {
      setState("working");
      showToast("已模拟导入 12 张照片", "success");
    });
    ["dragenter", "dragover"].forEach((type) => button.addEventListener(type, (event) => {
      event.preventDefault();
      button.dataset.dropActive = "true";
    }));
    ["dragleave", "drop"].forEach((type) => button.addEventListener(type, (event) => {
      event.preventDefault();
      delete button.dataset.dropActive;
      if (type === "drop") {
        setState("working");
        showToast("已模拟拖入 12 张照片", "success");
      }
    }));
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      if (app?.dataset.state === "empty") {
        showToast("当前没有照片，无法导出索引图", "warning");
        return;
      }
      button.dataset.busy = "true";
      showToast("演示导出已准备完成", "success");
      window.setTimeout(() => { delete button.dataset.busy; }, 520);
    });
  });

  updateThemeButtons();
  if (app) {
    const initialState = new URLSearchParams(window.location.search).get("state");
    setState(initialState === "empty" ? "empty" : app.dataset.state || "working");
  }
  if (range) setZoom(range.value);
})();
