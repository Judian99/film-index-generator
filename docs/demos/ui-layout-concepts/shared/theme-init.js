(() => {
  const storageKey = "filmIndex.uiLayoutTheme";
  let theme = "light";
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") theme = saved;
  } catch {}
  document.documentElement.dataset.theme = theme;
  window.filmIndexTheme = { storageKey };
})();
