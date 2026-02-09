const IGNORED_CAMPUSES = new Set([
  "c707e947-a097-459f-8c82-5ca548e46abe",
  "9bc1136e-b5c8-4dd1-94e8-f94e4029c9f8",
  "e561d833-400b-44f5-a6ac-951b0378a9f6",
  "8832e878-577e-4583-847a-d7e1db5d5507",
  "e33eae7d-dc6d-406f-8619-6834daa26eaa",
  "d97c0118-2ec7-488e-ac76-289392aeafee",
  "086a749b-f7aa-4eff-9ff9-40e8ae404041",
  "1e9f4e01-4a88-4c16-bd6a-4645ce9079f1",
  "6d4b8669-4107-47bd-96d0-380e7b5d1ad8",
]);

function saveMapToStorage(key, map) {
  localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
}

function loadMapFromStorage(key, map, errorMessage) {
  const stored = localStorage.getItem(key);
  if (!stored) return false;
  try {
    const entries = JSON.parse(stored);
    map.clear();
    entries.forEach(([k, v]) => map.set(k, v));
    return true;
  } catch (e) {
    if (errorMessage) console.error(errorMessage, e);
    else console.error("Failed to load data", e);
    return false;
  }
}

function renderPlaceholders(
  container,
  count = 4,
  className = "placeholder-card"
) {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = className;
    container.appendChild(p);
  }
}

function formatDurationHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startCountdownTimer(seconds, onTick, currentTimer) {
  if (currentTimer) clearInterval(currentTimer);
  let remaining = seconds;
  onTick(remaining);
  const timerId = setInterval(() => {
    remaining--;
    if (remaining < 0) {
      clearInterval(timerId);
      return;
    }
    onTick(remaining);
  }, 1000);
  return timerId;
}

function playSoundInternal(onError) {
  const audio = new Audio("jingle.mp3");
  const res = audio.play();
  if (res && typeof res.catch === "function") {
    res.catch((e) => {
      if (onError) onError(e);
    });
  }
}

function createSoundPlayer(onError) {
  return () => playSoundInternal(onError);
}

function createStatusHandler(el, options = {}) {
  const successColor = options.successColor || "#1D222C";
  const errorColor = options.errorColor || "#EB5757";
  const timeout = options.timeout === undefined ? 3000 : options.timeout;
  const setColor = options.setColor !== false;

  return (msg, isError = false) => {
    if (!el) return;
    el.textContent = msg;
    if (setColor) {
      el.style.color = isError ? errorColor : successColor;
    }
    el.style.display = "block";
    if (timeout !== 0) {
      setTimeout(() => (el.style.display = "none"), timeout);
    }
  };
}

function openUniqueTab(url, name) {
  window.open(url, name);
  return false;
}
