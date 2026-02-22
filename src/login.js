const S21_AUTH_CONFIG = {
  authUrl:
    "http://127.0.0.1:8080/https://auth.21-school.ru/auth/realms/EduPowerKeycloak/protocol/openid-connect/token",
};

const BASE_URL =
  "http://127.0.0.1:8080/https://platform.21-school.ru/services/21-school/api/v1";
const WATCHMAN_PROXY_ORIGIN = "http://127.0.0.1:8080";
const S21_PLATFORM_ORIGIN = "https://platform.21-school.ru";

function getProxyOrigin() {
  return WATCHMAN_PROXY_ORIGIN;
}

function getPlatformProxyUrl() {
  return `${WATCHMAN_PROXY_ORIGIN}/${S21_PLATFORM_ORIGIN}/`;
}

function getTelegramProxyUrl(token) {
  return `${WATCHMAN_PROXY_ORIGIN}/https://api.telegram.org/bot${token}/getMe`;
}




function getStoredCredentials() {
  try {
    const stored = localStorage.getItem("watchman_creds");
    if (stored) return JSON.parse(stored);

    const match = document.cookie.match(
      new RegExp("(^| )watchman_creds=([^;]+)")
    );
    if (match) {
      try {
        return JSON.parse(decodeURIComponent(match[2]));
      } catch (e) {
        console.warn("Не удается прочитать логин и пароль из куки", e);
      }
    }

    return null;
  } catch (e) {
    console.warn("Не удается прочитать логин и пароль из локального хранилища", e);
    return null;
  }
}

async function verifyTelegramBot(tokenOverride = null) {
  const creds = getStoredCredentials();
  const token = tokenOverride || (creds && creds.tgToken);

  if (!token) {
    throw new Error("Нет токена Телеграм бота");
  }

  const checkUrl = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error("Не удается верифицировать Телеграм бота");
    }
    return data.result.username;
  };

  try {
    return await checkUrl(`https://api.telegram.org/bot${token}/getMe`);
  } catch (directError) {
    try {
      return await checkUrl(getTelegramProxyUrl(token));
    } catch (proxyError) {
      console.error("Ошибка верификации Телеграм:", proxyError);
      throw proxyError;
    }
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

async function getAccessToken(username, password, force = false) {
  const creds = getStoredCredentials();
  
  const effectiveUser = username || (creds && creds.s21Login);
  const effectivePass = password || (creds && creds.s21Pass);

  if (!effectiveUser || !effectivePass) {
    throw new Error("Необходимы логин и пароль Платформы Школы 21");
  }

  if (!force && cachedToken && Date.now() < tokenExpiration - 60000) {
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
        cachedToken = null;
        tokenExpiration = 0;
        localStorage.removeItem("s21_auth_token");
        
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
