(() => {
  const template = document.getElementById("appPreviewTemplate");
  document.querySelectorAll("[data-card-preview]").forEach((target) => {
    target.append(template.content.cloneNode(true));
  });

  const group = document.querySelector("[data-sort-group]");
  const inputs = [...group.querySelectorAll('input[type="radio"]')];
  const status = document.querySelector("[data-status]");
  const dragList = document.querySelector("[data-drag-list]");
  const originalOrder = [...dragList.children].map((item) => item.dataset.dragItem);
  let dragged = null;
  let cycleTimer = 0;

  function syncSortIndicator() {
    const index = Math.max(0, inputs.findIndex((input) => input.checked));
    group.style.setProperty("--segment-index", String(index));
  }

  function setSortMode(mode, message) {
    const target = inputs.find((input) => input.value === mode) || inputs[0];
    target.checked = true;
    syncSortIndicator();
    status.textContent = message || ({ name: "当前按名称排序。", time: "当前按拍摄时间排序。", custom: "当前使用自定义顺序。" }[target.value]);
  }

  inputs.forEach((input) => {
    input.addEventListener("change", () => setSortMode(input.value));
  });

  document.querySelector("[data-async-sort]").addEventListener("click", async (event) => {
    window.clearInterval(cycleTimer);
    const trigger = event.currentTarget;
    const previous = inputs.find((input) => input.checked)?.value || "name";
    inputs.forEach((input) => { input.disabled = true; });
    trigger.disabled = true;
    status.textContent = "正在读取 EXIF 拍摄时间……";
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    inputs.forEach((input) => { input.disabled = false; });
    trigger.disabled = false;
    setSortMode("time", `已从${previous === "time" ? "当前" : "原"}排序切换到拍摄时间。`);
  });

  document.querySelector("[data-program-sort]").addEventListener("click", () => {
    window.clearInterval(cycleTimer);
    const modes = ["name", "time", "custom", "name"];
    let index = 0;
    setSortMode(modes[index], "程序化切换：名称");
    cycleTimer = window.setInterval(() => {
      index += 1;
      if (index >= modes.length) {
        window.clearInterval(cycleTimer);
        return;
      }
      setSortMode(modes[index], `程序化切换：${{ name: "名称", time: "时间", custom: "自定义" }[modes[index]]}`);
    }, 480);
  });

  function restoreOrder() {
    const map = new Map([...dragList.children].map((item) => [item.dataset.dragItem, item]));
    originalOrder.forEach((id) => dragList.append(map.get(id)));
  }

  document.querySelector("[data-reset]").addEventListener("click", () => {
    window.clearInterval(cycleTimer);
    restoreOrder();
    setSortMode("name", "已恢复名称排序和初始照片顺序。");
  });

  dragList.addEventListener("dragstart", (event) => {
    dragged = event.target.closest("[data-drag-item]");
    if (!dragged) return;
    dragged.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });

  dragList.addEventListener("dragover", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-drag-item]");
    dragList.querySelectorAll(".drag-target").forEach((item) => item.classList.remove("drag-target"));
    if (!dragged || !target || target === dragged) return;
    target.classList.add("drag-target");
  });

  dragList.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-drag-item]");
    if (!dragged || !target || target === dragged) return;
    const box = target.getBoundingClientRect();
    const after = event.clientX > box.left + box.width / 2;
    target.parentNode.insertBefore(dragged, after ? target.nextSibling : target);
    setSortMode("custom", `已拖动照片 ${dragged.dataset.dragItem}，自动切换为自定义排序。`);
  });

  dragList.addEventListener("dragend", () => {
    dragList.querySelectorAll(".is-dragging,.drag-target").forEach((item) => item.classList.remove("is-dragging", "drag-target"));
    dragged = null;
  });

  syncSortIndicator();
})();
