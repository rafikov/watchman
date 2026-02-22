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

async function checkProxy() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${getProxyOrigin()}/`, {
      signal: controller.signal,
      method: "HEAD",
    });
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    return false;
  }
}

async function checkSystemStatus() {
  const status = {
    localhost: "ok",
    platform: "ok",
    telegram: "no",
  };

  const creds = getStoredCredentials();
  if (creds && creds.tgToken) {
    status.telegram = "ok";
  }

  updateStatusUI(status);

  const isProxyOnline = await checkProxy();
  if (!isProxyOnline) {
    status.localhost = "fail";
    status.platform = "fail";
  } else {
    if (!creds || !creds.s21Login || !creds.s21Pass) {
      status.platform = "fail";
    } else {
      try {
        await getAccessToken(creds.s21Login, creds.s21Pass);
        status.platform = "ok";
      } catch (authErr) {
        console.warn("Status check: Auth failed", authErr);
        status.platform = "fail";
      }
    }
  }

  if (creds && creds.tgToken) {
    try {
      await verifyTelegramBot();
      status.telegram = "ok";
    } catch (e) {
      status.telegram = "fail";
    }
  } else {
    status.telegram = "no";
  }

  console.log("System Status Check:", status);
  localStorage.setItem("watchman_system_status", JSON.stringify(status));
  updateStatusUI(status);
  return status;
}

function loadCachedSystemStatus() {
  try {
    const cached = localStorage.getItem("watchman_system_status");
    if (cached) {
      const status = JSON.parse(cached);
      updateStatusUI(status);
    }
  } catch (e) {
    console.error("Failed to load cached status", e);
  }
}

async function sendTelegramMessage(message) {
  let creds = null;
  if (typeof getStoredCredentials === 'function') {
    creds = getStoredCredentials();
  } else {
    try {
      const stored = localStorage.getItem("watchman_creds");
      if (stored) creds = JSON.parse(stored);
    } catch (e) { console.warn("Creds read error", e); }
  }

  const token = creds && creds.tgToken;
  const userId = creds && creds.tgId;

  if (!token || !userId) {
    console.warn("Уведомления в телеграм отключены: нет токена и ID");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userId,
        text: message,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("Не удалось отправить сообщение в Телеграм:", data);
    } else {
      console.log("Сообщение отправлено в Телеграм для:", userId);
    }
  } catch (error) {
    console.error("Не удалось отправить сообщение в Телеграм:", error);
  }
}

function notifySubscription(contextName, intervalValue) {
    if (intervalValue !== "manual") {
        sendTelegramMessage(`Часовой / ${contextName}. Вы подписались на обновления. Интервал: ${intervalValue} мин.`);
    }
}

function updateStatusUI(status) {
  const platformEl = document.getElementById("status-ind-platform");
  const localhostEl = document.getElementById("status-ind-localhost") || document.getElementById("status-ind-proxy");
  const telegramEl = document.getElementById("status-ind-telegram");

  if (platformEl && localhostEl && telegramEl) {
    setIndicatorState(platformEl, status.platform);
    setIndicatorState(localhostEl, status.localhost);
    setIndicatorState(telegramEl, status.telegram);
  }

  const connectionStatusEl = document.querySelector(".connection-status");
  if (connectionStatusEl) {
    const isOk = status.platform === "ok" && status.localhost === "ok";
    connectionStatusEl.classList.remove("status-ok", "status-fail");
    connectionStatusEl.classList.add(isOk ? "status-ok" : "status-fail");

    const telegramText =
      status.telegram === "ok"
        ? "OK"
        : status.telegram === "no"
        ? "Нет"
        : "Fail";
    
    connectionStatusEl.innerHTML = `<span class="status-text">Платформа: ${status.platform.toUpperCase()}&nbsp;&nbsp;&nbsp;localhost: ${status.localhost.toUpperCase()}&nbsp;&nbsp;&nbsp;Телеграм: ${telegramText}</span>`;
  }
}

function setIndicatorState(el, state) {
  el.className = "status-value";
  if (state === "ok") {
    el.textContent = "OK";
    el.classList.add("color-green");
  } else if (state === "fail") {
    el.textContent = "Fail";
    el.classList.add("color-red");
  } else {
    el.textContent = "Нет";
    el.classList.add("color-grey");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.querySelector(".connection-status");
  const hasIndicators = document.getElementById("status-ind-platform");
  
  loadCachedSystemStatus();

  if (statusEl || hasIndicators) {
    checkSystemStatus();
  }

  if (statusEl) {
    statusEl.style.cursor = "pointer";
    statusEl.title = "Нажмите, чтобы обновить статус";
    statusEl.addEventListener("click", () => {
      statusEl.innerHTML = '<span class="status-text">Проверка...</span>';
      checkSystemStatus();
    });
  }
});
