(function () {
  let debugEnabled = false;
  let debugTimer = null;
  let badge = null;

  function detectPage() {
    const container = document.querySelector(".container");
    if (!container) return null;
    if (container.classList.contains("w-campus")) return "campus";
    if (container.classList.contains("w-coins")) return "coins";
    if (container.classList.contains("w-peers")) return "peers";
    return null;
  }

  const pageType = detectPage();
  if (!pageType) return;

  function createBadge() {
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "debug-badge";
      document.body.appendChild(badge);
      updateBadge("hint");
    }
  }

  function updateBadge(mode) {
    if (!badge) return;

    if (mode === "active") {
      badge.textContent = "DEBUG MODE";
      badge.style.cssText =
        "position: fixed; bottom: 10px; right: 10px; background: red; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; z-index: 9999; cursor: default;";
    } else {
      badge.textContent = "Ctrl + Shift + D";
      badge.style.cssText =
        "position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; z-index: 9998; cursor: default;";
    }
  }

  const MOCK_USERS = [
    "neo",
    "morpheus",
    "trinity",
    "smith",
    "cypher",
    "tank",
    "dozer",
    "mouse",
    "apoc",
    "switch",
  ];

  window.isDebugUser = function(login) {
      return MOCK_USERS.includes(login);
  };

  window.handleDebugTooltip = function(login) {
      if (!MOCK_USERS.includes(login)) return false;

      const levelEl = document.getElementById("tt-level");
      const classEl = document.getElementById("tt-classname");
      const projectEl = document.getElementById("tt-project");
      const statusEl = document.getElementById("tt-status");

      if (levelEl) levelEl.textContent = "Debug";
      if (classEl) classEl.textContent = "Matrix";
      if (projectEl) projectEl.textContent = "Simulation";
      if (statusEl) {
          statusEl.textContent = "Virtual";
          statusEl.style.background = "#e2e3e5";
      }
      return true;
  };

  createBadge();

  async function simulateCampus() {
    const clusters = window.clusters;
    const mapData = window.mapData;
    const hostState = window.hostState;
    const logUpdate = window.logUpdate;
    const sendTelegramMessage = window.sendTelegramMessage; 
    const playSound = window.playSound;
    const soundCheckbox = document.getElementById("sound-enabled");

    if (!clusters || clusters.length === 0) return;

    const randomCluster = clusters[Math.floor(Math.random() * clusters.length)];
    const hosts = mapData.get(randomCluster.id);

    if (!hosts || hosts.length === 0) return;

    const randomHost = hosts[Math.floor(Math.random() * hosts.length)];
    const seatId = `${randomCluster.id}-${randomHost.row}-${randomHost.number}`;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const location = `${randomCluster.name} ${randomHost.row}-${randomHost.number}`;

    let update = null;
    let telegramMsg = "";

    if (randomHost.login) {
      const user = randomHost.login;
      randomHost.login = null;
      if (hostState) hostState.delete(seatId);

      update = { type: "logout", location, user, time: timeStr };
      telegramMsg = `${user} ушел из ${location}`;

      const seatEl = document.querySelector(
        `.seat[data-location="${location}"]`
      );
      if (seatEl) {
        seatEl.classList.remove("occupied", "watched");
        seatEl.removeAttribute("data-login");
        seatEl.title = "";
      }
    } else {
      const randomUser =
        MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

      randomHost.login = randomUser;
      if (hostState)
        hostState.set(seatId, { user: randomUser, seatId, location });

      update = { type: "login", location, user: randomUser, time: timeStr };
      telegramMsg = `${randomUser} пришел в ${location}`;

      const seatEl = document.querySelector(
        `.seat[data-location="${location}"]`
      );
      if (seatEl) {
        seatEl.classList.add("occupied");
        seatEl.dataset.login = randomUser;
        seatEl.title = randomUser;
      }
    }

    if (logUpdate && update) {
      logUpdate(update);
    }

    if (sendTelegramMessage && telegramMsg) {
       await sendTelegramMessage(`Часовой / Кампус. События (DEBUG):\n${telegramMsg}`.replace(/&rarr;/g, "->"));
    }

    if (soundCheckbox && soundCheckbox.checked && playSound) {
      playSound();
    }
  }

  async function simulatePeers() {
    const participants = window.participants;
    const saveToStorage = window.saveToStorage;
    const logUpdate = window.logUpdate;
    const renderParticipants = window.renderParticipants;
    const playSound = window.playSound;
    const sendTelegramMessage = window.sendTelegramMessage;
    const showStatus = window.showStatus;
    const soundCheckbox = document.getElementById("sound-enabled");

    if (!participants) return;

    let login = "DebugUser";
    if (participants.size > 0) {
      const keys = Array.from(participants.keys());
      login = keys[Math.floor(Math.random() * keys.length)];
    }

    const currentData = participants.get(login) || {
      coins: 1000,
      xp: 0,
      prp: 0,
      level: 0,
      projects: [],
      status: "Offline",
      className: "-",
    };

    const REAL_STATUSES = [
      "ACTIVE",
      "TEMPORARY_BLOCKING",
      "EXPELLED",
      "BLOCKED",
      "FROZEN",
      "STUDY_COMPLETED",
      "Online (E1 404)",
      "Online (B2 101)",
      "Online (Cluster 3 R5)"
    ];

    const rand = Math.random();
    let eventText = "";
    let eventType = "";

    if (rand < 0.2) {
      eventType = "xp";
      const diff = Math.floor(Math.random() * 200) - 100;
      if (diff === 0) return;
      const newXp = (currentData.xp || 0) + diff;
      const newData = { ...currentData, xp: newXp };
      participants.set(login, newData);
      eventText = `XP: ${diff > 0 ? "+" : ""}${diff} (${currentData.xp} &rarr; ${newXp})`;
    } else if (rand < 0.4) {
      eventType = "prp";
      const diff = Math.floor(Math.random() * 20) - 10;
      if (diff === 0) return;
      const newPrp = (currentData.prp || 0) + diff / 10;
      const newData = { ...currentData, prp: newPrp };
      participants.set(login, newData);
      eventText = `PRP: ${diff > 0 ? "+" : ""}${diff / 10} (${currentData.prp} &rarr; ${newPrp})`;
    } else if (rand < 0.6) {
      eventType = "coins";
       const diff = Math.floor(Math.random() * 50) - 25;
       if (diff === 0) return;
       const newCoins = (currentData.coins || 0) + diff;
       const newData = { ...currentData, coins: newCoins };
       participants.set(login, newData);
       eventText = `Монетки: ${diff > 0 ? "+" : ""}${diff} (${currentData.coins} &rarr; ${newCoins})`;
    } else if (rand < 0.8) {
      eventType = "status";
      const newStatus = REAL_STATUSES[Math.floor(Math.random() * REAL_STATUSES.length)];
      const newData = { ...currentData, status: newStatus };
      participants.set(login, newData);
      eventText = `Статус: ${currentData.status} &rarr; ${newStatus}`;
    } else {
      eventType = "projects";
      eventText = `Изменения в проектах (Simulation)`;
    }

    
    let isEnabled = true;
    const checkbox = document.querySelector(`.settings-panel input[type="checkbox"][data-target="${eventType}"]`);
    if (checkbox && !checkbox.checked) {
      isEnabled = false;
    }

    if (saveToStorage) saveToStorage();
    if (renderParticipants) renderParticipants();

    if (isEnabled) {
        if (logUpdate) logUpdate(login, eventText);
        
        if (sendTelegramMessage) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
                now.getMinutes()
            ).padStart(2, "0")}`;
            const msg = `Часовой / Пиры. События (DEBUG):\n${login}: ${eventText}`;
            await sendTelegramMessage(msg.replace(/&rarr;/g, "->"));
        }
    }

    if (soundCheckbox && soundCheckbox.checked && playSound) {
      playSound();
    }

    if (showStatus) showStatus(`Debug event: ${login} (${eventType})`);
  }

  function toggleDebug() {
    if (pageType === "campus") {
      debugEnabled = !debugEnabled;
      if (debugEnabled) {
        updateBadge("active");
        if (window.showStatus) window.showStatus("Debug Mode ENABLED");
        simulateCampus();
        debugTimer = setInterval(simulateCampus, 3000);
      } else {
        updateBadge("hint");
        if (window.showStatus) window.showStatus("Debug Mode DISABLED");
        if (debugTimer) {
          clearInterval(debugTimer);
          debugTimer = null;
        }
      }
    } else if (pageType === "peers") {
      simulatePeers();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
      e.preventDefault();
      toggleDebug();
    }
  });
})();
