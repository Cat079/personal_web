// 卡片进入视口时再播放渐入动画。
const interactiveCards = document.querySelectorAll(".interactive-card");
interactiveCards.forEach((card) => card.classList.add("reveal-on-scroll"));

if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("js-motion");
  const cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -24px 0px" });

  interactiveCards.forEach((card) => cardObserver.observe(card));
} else {
  // 不支持 IntersectionObserver 的旧浏览器直接显示卡片。
  interactiveCards.forEach((card) => card.classList.add("is-visible"));
}

// 点击邮箱按钮复制地址，并在页面右下角显示 Toast。
const emailAddress = "3309608896@qq.com";
const copyButton = document.querySelector("#copy-email");
const toast = document.querySelector("#copy-toast");
const toastMessage = toast.querySelector(".toast-message");
let toastTimer;

function showToast(message, isError = false) {
  toastMessage.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function fallbackCopyEmail() {
  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = emailAddress;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  const copied = document.execCommand("copy");
  temporaryInput.remove();
  if (!copied) throw new Error("复制失败");
}

async function copyEmail() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(emailAddress);
      } catch {
        // 剪贴板权限不可用时，再尝试兼容性复制方式。
        fallbackCopyEmail();
      }
    } else {
      // 本地文件或非安全上下文时，使用兼容性复制方式。
      fallbackCopyEmail();
    }
    showToast("邮箱已复制！");
  } catch {
    showToast("复制失败，请手动复制邮箱。", true);
  }
}

copyButton.addEventListener("click", copyEmail);

// 更新顶部阅读进度条。
const progressTrack = document.querySelector("#reading-progress");
const progressFill = document.querySelector("#reading-progress-fill");

function updateReadingProgress() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
  progressFill.style.transform = `scaleX(${progress})`;
  progressTrack.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress, { passive: true });
updateReadingProgress();

// 桌面鼠标效果共用断点，手机端不会安装指针移动监听。
const cardTiltQuery = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
const pointerGlow = document.querySelector("#pointer-glow");

function updatePointerGlow(event) {
  if (event.pointerType === "touch") return;
  pointerGlow.style.left = `${event.clientX}px`;
  pointerGlow.style.top = `${event.clientY}px`;
}

function setPointerGlowEnabled(enabled) {
  if (enabled) {
    window.addEventListener("pointermove", updatePointerGlow, { passive: true });
  } else {
    window.removeEventListener("pointermove", updatePointerGlow);
  }
}

// 仅在桌面鼠标环境启用卡片聚光和倾斜，尺寸变化时同步启停监听。
function updateCardLighting(event) {
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  const pointerX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  const pointerY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

  card.style.setProperty("--spot-x", `${pointerX * 100}%`);
  card.style.setProperty("--spot-y", `${pointerY * 100}%`);
  card.style.setProperty("--rotate-x", `${(0.5 - pointerY) * 9}deg`);
  card.style.setProperty("--rotate-y", `${(pointerX - 0.5) * 11}deg`);
  card.classList.add("is-pointer-active");
}

function clearCardLighting(card) {
  card.style.removeProperty("--spot-x");
  card.style.removeProperty("--spot-y");
  card.style.removeProperty("--rotate-x");
  card.style.removeProperty("--rotate-y");
  card.classList.remove("is-pointer-active");
}

function resetCardLighting(event) {
  clearCardLighting(event.currentTarget);
}

function setCardLightingEnabled(enabled) {
  interactiveCards.forEach((card) => {
    if (enabled) {
      card.addEventListener("pointermove", updateCardLighting, { passive: true });
      card.addEventListener("pointerleave", resetCardLighting);
    } else {
      card.removeEventListener("pointermove", updateCardLighting);
      card.removeEventListener("pointerleave", resetCardLighting);
      clearCardLighting(card);
    }
  });
}

function updateDesktopEffects(enabled) {
  setCardLightingEnabled(enabled);
  setPointerGlowEnabled(enabled);
}

updateDesktopEffects(cardTiltQuery.matches);
if (cardTiltQuery.addEventListener) {
  cardTiltQuery.addEventListener("change", (event) => updateDesktopEffects(event.matches));
} else {
  cardTiltQuery.addListener((event) => updateDesktopEffects(event.matches));
}

// 平滑滚轮：缩放、横向手势与减少动态效果设置保持原生行为。
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReducedMotion) {
  let wheelFrame = null;
  let targetScroll = window.scrollY;
  let previousScrollBehavior = "";

  function animateWheelScroll() {
    const currentScroll = window.scrollY;
    const remainingDistance = targetScroll - currentScroll;
    if (Math.abs(remainingDistance) < 1) {
      window.scrollTo(0, targetScroll);
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      wheelFrame = null;
      return;
    }
    window.scrollTo(0, currentScroll + remainingDistance * 0.14);
    wheelFrame = window.requestAnimationFrame(animateWheelScroll);
  }

  window.addEventListener("wheel", (event) => {
    // 保留浏览器缩放和横向滚动的原生手势。
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const wheelDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 24
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? event.deltaY * window.innerHeight
        : event.deltaY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    event.preventDefault();
    if (wheelFrame === null) {
      targetScroll = window.scrollY;
      previousScrollBehavior = document.documentElement.style.scrollBehavior;
      // 逐帧滚动由下方缓动控制，避免 CSS 平滑行为叠加。
      document.documentElement.style.scrollBehavior = "auto";
    }
    targetScroll = Math.min(maxScroll, Math.max(0, targetScroll + wheelDelta));
    if (wheelFrame === null) wheelFrame = window.requestAnimationFrame(animateWheelScroll);
  }, { passive: false });
}

// Guess Number Game：每次打开或点击“重新开始”都会生成新的 1–100 整数。
const gameDialog = document.querySelector("#guess-game");
const openGameButton = document.querySelector("#open-game");
const closeGameButton = document.querySelector("#close-game");
const restartGameButton = document.querySelector("#restart-game");
const gameForm = document.querySelector("#guess-form");
const gameInput = document.querySelector("#guess-input");
const gameSubmitButton = gameForm.querySelector('button[type="submit"]');
const gameStatus = document.querySelector("#game-status");
const guessCountOutput = document.querySelector("#guess-count");
let targetNumber;
let guessCount = 0;
let gameFinished = false;

function startNewGame() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
  guessCount = 0;
  gameFinished = false;
  guessCountOutput.textContent = "0";
  gameInput.value = "";
  gameInput.disabled = false;
  gameSubmitButton.disabled = false;
  gameStatus.dataset.state = "ready";
  gameStatus.textContent = "输入一个数字，开始挑战。";
}

openGameButton.addEventListener("click", () => {
  startNewGame();
  gameDialog.showModal();
  gameInput.focus();
});

closeGameButton.addEventListener("click", () => gameDialog.close());
restartGameButton.addEventListener("click", () => {
  startNewGame();
  gameInput.focus();
});

gameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (gameFinished) return;

  const guess = Number(gameInput.value);
  if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
    gameStatus.dataset.state = "error";
    gameStatus.textContent = "请输入 1 到 100 之间的整数。";
    gameInput.focus();
    return;
  }

  guessCount += 1;
  guessCountOutput.textContent = String(guessCount);

  if (guess === targetNumber) {
    gameFinished = true;
    gameInput.disabled = true;
    gameSubmitButton.disabled = true;
    gameStatus.dataset.state = "success";
    gameStatus.textContent = `猜中了！答案是 ${targetNumber}，共猜测 ${guessCount} 次。`;
  } else if (guess < targetNumber) {
    gameStatus.dataset.state = "low";
    gameStatus.textContent = "小了，再试一个更大的数字。";
  } else {
    gameStatus.dataset.state = "high";
    gameStatus.textContent = "大了，再试一个更小的数字。";
  }

  if (!gameFinished) {
    gameInput.select();
  }
});

// 点击遮罩关闭弹窗；关闭后把键盘焦点送回“在线试玩”按钮。
gameDialog.addEventListener("click", (event) => {
  if (event.target === gameDialog) gameDialog.close();
});
gameDialog.addEventListener("close", () => openGameButton.focus());
