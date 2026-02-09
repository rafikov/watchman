/****************************************/
/****** Доступ к Платформе Школы 21 *****/
/****************************************/

const S21_AUTH_CONFIG = {
  authUrl:
    "http://127.0.0.1:8080/https://auth.21-school.ru/auth/realms/EduPowerKeycloak/protocol/openid-connect/token",
  defaultUsername: "", // Логин в Школе: "watchman"
  defaultPassword: "", // Пароль в Школе: "123456"
};


/****************************************/
/******* Доступ к боту в Телеграм ******/
/****************************************/

const TG_CONFIG = {
  botToken: "", // Бот создается в @BotFather. Токен: "xxxxxxxxx:xxxxxx..."
  userId: "", // Получить свой ID в Телегарм через @userinfobot. ID: "xxxxxxxxx"
};


/****************************************/
/********* URL для доступа к API ********/
/****************************************/

const BASE_URL =
  "http://127.0.0.1:8080/https://platform.21-school.ru/services/21-school/api/v1";




function getStoredCredentials() {
  try {
    const session = sessionStorage.getItem("watchman_creds");
    if (session) return JSON.parse(session);

    const match = document.cookie.match(new RegExp('(^| )watchman_creds=([^;]+)'));
    if (match) {
        try {
            return JSON.parse(decodeURIComponent(match[2]));
        } catch (e) {
            console.warn("Не удается прочитать логин и пароль из куки", e);
        }
    }

    const stored = localStorage.getItem("watchman_creds");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("Не удается прочитать логин и пароль из локального хранилища", e);
    return null;
  }
}

async function verifyTelegramBot() {
  const creds = getStoredCredentials();
  const token = (creds && creds.tgToken) || TG_CONFIG.botToken;

  if (!token) {
    throw new Error("Нет токена Телеграм бота");
  }

  const url = `https://api.telegram.org/bot${token}/getMe`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error("Не удается верифицировать Телеграм бота");
    }

    return data.result.username;
  } catch (error) {
    console.error("Ошибка верификации Телеграм:", error);
    throw error;
  }
}

async function sendTelegramMessage(message) {
  const creds = getStoredCredentials();
  const token = (creds && creds.tgToken) || TG_CONFIG.botToken;
  const userId = (creds && creds.tgId) || TG_CONFIG.userId;

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

let cachedToken = null;
let tokenExpiration = 0;

try {
  const stored = localStorage.getItem("s21_auth_token");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Date.now() < parsed.expiration - 60000) {
      cachedToken = parsed.token;
      tokenExpiration = parsed.expiration;
    }
  }
} catch (e) {
  console.warn("Не удается прочитать токен из локального хранилища", e);
}

async function getAccessToken(username, password) {
  const creds = getStoredCredentials();
  
  const effectiveUser = username || (creds && creds.s21Login) || S21_AUTH_CONFIG.defaultUsername;
  const effectivePass = password || (creds && creds.s21Pass) || S21_AUTH_CONFIG.defaultPassword;

  if (!effectiveUser || !effectivePass) {
    throw new Error("Необходимы логин и пароль Платформы Школы 21");
  }

  if (cachedToken && Date.now() < tokenExpiration - 60000) {
    return cachedToken;
  }

  const formData = new URLSearchParams();
  formData.append("client_id", "s21-open-api");
  formData.append("username", effectiveUser);
  formData.append("password", effectivePass);
  formData.append("grant_type", "password");

  console.log("Вход пользователя:", effectiveUser);

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(S21_AUTH_CONFIG.authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Ошибка сервера ${response.status}`);
        }
        throw new Error(
          `Не удалась аутентификация: ${
            data.error_description || "Неправильные логин и пароль"
          }`
        );
      }

      if (!data.access_token) {
        throw new Error("Нет токена в ответе");
      }

      cachedToken = data.access_token;
      const expiresIn = data.expires_in || 3600;
      tokenExpiration = Date.now() + expiresIn * 1000;

      try {
        localStorage.setItem(
          "s21_auth_token",
          JSON.stringify({
            token: cachedToken,
            expiration: tokenExpiration,
          })
        );
      } catch (e) {
        console.warn("Не удалось сохранить в локальне хранилище", e);
      }

      return data.access_token;
    } catch (e) {
      console.warn(`Попытка ${i + 1} не удалась:`, e);
      if (i === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
