(() => {
  "use strict";

  const totalSeconds = 180;
  let remainingSeconds = totalSeconds;
  let timerId = null;
  let running = false;
  let paused = false;

  const $ = (selector) => document.querySelector(selector);
  const timerValue = $("#timerValue");
  const timerFill = $("#timerFill");
  const startButton = $("#startButton");
  const pauseButton = $("#pauseButton");
  const settingsButton = $("#settingsButton");
  const pauseOverlay = $("#pauseOverlay");
  const settingsOverlay = $("#settingsOverlay");
  const resumeButton = $("#resumeButton");
  const closeSettingsButton = $("#closeSettingsButton");
  const toast = $("#toast");

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function renderTimer() {
    timerValue.textContent = formatTime(remainingSeconds);
    timerFill.style.width = `${(remainingSeconds / totalSeconds) * 100}%`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 1500);
  }

  function finishDay() {
    running = false;
    paused = false;
    window.clearInterval(timerId);
    timerId = null;
    startButton.hidden = false;
    startButton.querySelector("strong").textContent = "다시 시작";
    showToast("오늘 영업이 끝났어요 🌕");
  }

  function tick() {
    if (!running || paused) return;
    remainingSeconds -= 1;
    renderTimer();
    if (remainingSeconds <= 0) finishDay();
  }

  function startDay() {
    window.clearInterval(timerId);
    remainingSeconds = totalSeconds;
    running = true;
    paused = false;
    renderTimer();
    startButton.hidden = true;
    timerId = window.setInterval(tick, 1000);
    showToast("영업을 시작합니다!");
  }

  function pauseDay() {
    if (!running) {
      showToast("영업 시작 후 사용할 수 있어요.");
      return;
    }
    paused = true;
    pauseOverlay.classList.remove("hidden");
  }

  function resumeDay() {
    paused = false;
    pauseOverlay.classList.add("hidden");
  }

  startButton.addEventListener("click", startDay);
  pauseButton.addEventListener("click", pauseDay);
  resumeButton.addEventListener("click", resumeDay);

  settingsButton.addEventListener("click", () => {
    if (running) paused = true;
    settingsOverlay.classList.remove("hidden");
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsOverlay.classList.add("hidden");
    if (running) paused = false;
  });

  document.querySelectorAll(".item, .station:not(.locked)").forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.dataset.label || button.textContent.trim();
      showToast(`${label} · V0.01 화면 시안`);
    });
  });

  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => window.scrollTo(0, 0), 180);
  });

  renderTimer();
})();
