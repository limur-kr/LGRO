(function () {
  const API_BASE_URL = "http://127.0.0.1:8000/api";
  const API_ORIGIN = new URL(API_BASE_URL).origin;
  const ACCESS_TOKEN_KEY = "jjampong_access_token";
  const REFRESH_TOKEN_KEY = "jjampong_refresh_token";
  const DEFAULT_PAGE_SIZE = 20;
  const FALLBACK_IMAGE =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f3f3f3"/><circle cx="320" cy="210" r="112" fill="#ffdad6"/><circle cx="320" cy="210" r="78" fill="#db322f"/><path d="M220 130c54 36 147 36 200 0" fill="none" stroke="#1a1c1c" stroke-width="14" stroke-linecap="round"/><text x="320" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1a1c1c">JJAMPPONG</text></svg>'
    );

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  function getAccessToken() {
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem("access") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem("refresh") || "";
  }

  function setTokens(tokens) {
    if (tokens && tokens.access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    }
    if (tokens && tokens.refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    }
    updateAuthButtons();
    document.dispatchEvent(new CustomEvent("auth:changed", { detail: { isAuthenticated: isLoggedIn() } }));
  }

  function clearTokens() {
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, "access", "refresh", "accessToken", "jwt"].forEach((key) =>
      localStorage.removeItem(key)
    );
    updateAuthButtons();
    document.dispatchEvent(new CustomEvent("auth:changed", { detail: { isAuthenticated: false } }));
  }

  function isLoggedIn() {
    return Boolean(getAccessToken());
  }

  function normalizePath(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function buildUrl(path, params) {
    const url = new URL(normalizePath(path));
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = new Headers(opts.headers || {});
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(path, opts.params), {
      ...opts,
      headers,
      body,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        clearTokens();
      }
      const message =
        (data && (data.detail || data.error || data.message)) ||
        (typeof data === "string" && data) ||
        `API 요청에 실패했습니다. (${response.status})`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  function sendAnalytics(path, payload) {
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
      keepalive: true,
    }).catch((error) => {
      console.warn("Analytics event failed", error);
    });
  }

  function getRestaurants(params) {
    return request("/restaurants/", { params });
  }

  function getRestaurantDetail(id) {
    return request(`/restaurants/${encodeURIComponent(id)}/`);
  }

  function getRestaurantSentiment(id) {
    return request(`/restaurants/${encodeURIComponent(id)}/sentiment/`);
  }

  function getRegions() {
    return request("/regions/");
  }

  function favoriteRestaurant(id) {
    return request(`/restaurants/${encodeURIComponent(id)}/favorite/`, {
      method: "POST",
    });
  }

  function unfavoriteRestaurant(id) {
    return request(`/restaurants/${encodeURIComponent(id)}/favorite/`, {
      method: "DELETE",
    });
  }

  function login(credentials) {
    return request("/auth/login/", {
      method: "POST",
      body: credentials,
    });
  }

  function register(payload) {
    return request("/auth/register/", {
      method: "POST",
      body: payload,
    });
  }

  function submitQuestion(payload) {
    return request("/questions/", {
      method: "POST",
      body: payload,
    });
  }

  function logVisit(payload) {
    return request("/analytics/visits/", {
      method: "POST",
      body: payload,
    });
  }

  function logSearch(payload) {
    return request("/analytics/searches/", {
      method: "POST",
      body: payload,
    });
  }

  function trackVisit(payload) {
    return sendAnalytics("/analytics/visits/", payload);
  }

  function trackSearch(payload) {
    const data = typeof payload === "string" ? { keyword: payload } : payload || {};
    if (!data.keyword) {
      return Promise.resolve();
    }
    return sendAnalytics("/analytics/searches/", data);
  }

  function recordCurrentVisit() {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get("id");
    const payload = {
      event_type: restaurantId && window.location.pathname.endsWith("reviews.html") ? "detail_view" : "page_view",
      path: window.location.pathname || "/",
      full_url: window.location.href,
      referrer: document.referrer,
      metadata: { title: document.title },
    };

    if (restaurantId) {
      payload.restaurant = restaurantId;
    }

    return trackVisit(payload);
  }

  function unwrapResults(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  }

  function resolveImageUrl(path) {
    if (!path) {
      return FALLBACK_IMAGE;
    }
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `${API_ORIGIN}${path}`;
    }
    return `${API_ORIGIN}/${path}`;
  }

  function getPrimaryImage(restaurant) {
    if (!restaurant) {
      return FALLBACK_IMAGE;
    }
    if (restaurant.primary_image_url) {
      return resolveImageUrl(restaurant.primary_image_url);
    }
    const image = Array.isArray(restaurant.images) ? restaurant.images[0] : null;
    return resolveImageUrl(image && (image.image_url || image.image));
  }

  function regionName(restaurant) {
    return restaurant && restaurant.region ? restaurant.region.name : "지역 미상";
  }

  function soupStyleLabel(style) {
    const labels = {
      MEAT: "고기 육수",
      SEAFOOD: "해물 육수",
      MIXED: "혼합 육수",
      UNKNOWN: "미분류",
    };
    return labels[style] || "미분류";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
      return "가격 미상";
    }
    return `${Number(value).toLocaleString("ko-KR")}원`;
  }

  function formatScore(value, fallback) {
    if (value === null || value === undefined || value === "") {
      return fallback || "0.0";
    }
    return Number(value).toFixed(1);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function spiceBlocks(level) {
    const current = Math.max(0, Math.min(5, Number(level || 0)));
    return Array.from({ length: 5 }, (_, index) => {
      const color = index < current ? "bg-primary" : "bg-surface-variant";
      return `<span class="w-4 h-4 ${color} border border-on-background"></span>`;
    }).join("");
  }

  function renderPagination(container, data, currentPage, onPageChange) {
    if (!container) {
      return;
    }
    const count = data && Number(data.count);
    const results = unwrapResults(data);
    const pageSize = data && Array.isArray(data.results) ? DEFAULT_PAGE_SIZE : results.length || DEFAULT_PAGE_SIZE;
    const totalPages = count ? Math.max(1, Math.ceil(count / pageSize)) : 1;

    if (!count || totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const page = Math.max(1, Number(currentPage || 1));
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const pages = [];
    for (let number = start; number <= end; number += 1) {
      pages.push(number);
    }

    container.innerHTML = [
      `<button type="button" data-page="${Math.max(1, page - 1)}" class="px-4 h-10 border-2 border-on-background bg-surface font-label-caps ${
        page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-container"
      }">이전</button>`,
      ...pages.map(
        (number) =>
          `<button type="button" data-page="${number}" class="w-10 h-10 border-2 border-on-background font-label-caps ${
            number === page
              ? "bg-primary text-on-primary"
              : "bg-surface text-on-background hover:bg-surface-container"
          }">${number}</button>`
      ),
      `<button type="button" data-page="${Math.min(totalPages, page + 1)}" class="px-4 h-10 border-2 border-on-background bg-surface font-label-caps ${
        page === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-container"
      }">다음</button>`,
    ].join("");

    container.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextPage = Number(button.dataset.page);
        if (nextPage !== page) {
          onPageChange(nextPage);
        }
      });
    });
  }

  function ensureAuthModal() {
    let modal = document.getElementById("auth-modal");
    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "fixed inset-0 z-[200] hidden items-center justify-center bg-black/60 px-4";
    modal.innerHTML = `
      <div class="w-full max-w-md border-4 border-on-background bg-surface hard-shadow">
        <div class="flex items-center justify-between border-b-2 border-on-background p-5">
          <h2 class="font-headline-lg text-headline-lg">계정</h2>
          <button type="button" data-auth-close class="text-on-surface-variant hover:text-primary">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="grid grid-cols-2 border-b-2 border-on-background">
          <button type="button" data-auth-tab="login" class="bg-primary py-3 font-title-md text-on-primary">로그인</button>
          <button type="button" data-auth-tab="register" class="py-3 font-title-md text-on-surface-variant">회원가입</button>
        </div>
        <div class="p-6">
          <form data-auth-panel="login" class="space-y-4">
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">USERNAME</span>
              <input name="username" required class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="username" />
            </label>
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">PASSWORD</span>
              <input name="password" required type="password" class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="current-password" />
            </label>
            <button type="submit" class="w-full bg-primary px-4 py-3 font-title-md text-on-primary hard-shadow">로그인</button>
          </form>
          <form data-auth-panel="register" class="hidden space-y-4">
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">USERNAME</span>
              <input name="username" required class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="username" />
            </label>
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">EMAIL</span>
              <input name="email" required type="email" class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="email" />
            </label>
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">DISPLAY NAME</span>
              <input name="display_name" class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="name" />
            </label>
            <label class="block">
              <span class="mb-2 block font-label-caps text-label-caps text-on-surface-variant">PASSWORD</span>
              <input name="password" required minlength="8" type="password" class="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:ring-0" autocomplete="new-password" />
            </label>
            <button type="submit" class="w-full bg-primary px-4 py-3 font-title-md text-on-primary hard-shadow">회원가입</button>
          </form>
          <p data-auth-message class="mt-4 min-h-5 font-body-sm text-body-sm text-primary"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-auth-close]")) {
        closeAuthModal();
      }
    });

    modal.querySelectorAll("[data-auth-tab]").forEach((tab) => {
      tab.addEventListener("click", () => switchAuthTab(tab.dataset.authTab));
    });

    modal.querySelector('[data-auth-panel="login"]').addEventListener("submit", handleLoginSubmit);
    modal.querySelector('[data-auth-panel="register"]').addEventListener("submit", handleRegisterSubmit);
    return modal;
  }

  function setAuthMessage(message, isError) {
    const modal = ensureAuthModal();
    const target = modal.querySelector("[data-auth-message]");
    target.textContent = message || "";
    target.classList.toggle("text-error", Boolean(isError));
    target.classList.toggle("text-primary", !isError);
  }

  function switchAuthTab(name) {
    const modal = ensureAuthModal();
    modal.querySelectorAll("[data-auth-tab]").forEach((tab) => {
      const isActive = tab.dataset.authTab === name;
      tab.classList.toggle("bg-primary", isActive);
      tab.classList.toggle("text-on-primary", isActive);
      tab.classList.toggle("text-on-surface-variant", !isActive);
    });
    modal.querySelectorAll("[data-auth-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.authPanel !== name);
    });
    setAuthMessage("");
  }

  function openAuthModal(tab) {
    const modal = ensureAuthModal();
    switchAuthTab(tab || "login");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    const firstInput = modal.querySelector('[data-auth-panel]:not(.hidden) input');
    if (firstInput) {
      firstInput.focus();
    }
  }

  function closeAuthModal() {
    const modal = ensureAuthModal();
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setAuthMessage("로그인 중입니다...");
    try {
      const tokens = await login(payload);
      setTokens(tokens);
      setAuthMessage("로그인되었습니다.");
      setTimeout(closeAuthModal, 500);
    } catch (error) {
      setAuthMessage(error.message || "로그인에 실패했습니다.", true);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setAuthMessage("회원가입 중입니다...");
    try {
      await register(payload);
      const tokens = await login({ username: payload.username, password: payload.password });
      setTokens(tokens);
      setAuthMessage("가입과 로그인이 완료되었습니다.");
      setTimeout(closeAuthModal, 500);
    } catch (error) {
      setAuthMessage(error.message || "회원가입에 실패했습니다.", true);
    }
  }

  function updateAuthButtons() {
    const loggedIn = isLoggedIn();
    document.querySelectorAll("[data-auth-button]").forEach((button) => {
      button.textContent = loggedIn ? "로그아웃" : "로그인";
      button.setAttribute("aria-label", loggedIn ? "로그아웃" : "로그인");
    });
  }

  function bindAuthButtons() {
    document.querySelectorAll("[data-auth-button]").forEach((button) => {
      if (button.dataset.authBound) {
        return;
      }
      button.dataset.authBound = "true";
      button.addEventListener("click", () => {
        if (isLoggedIn()) {
          clearTokens();
        } else {
          openAuthModal("login");
        }
      });
    });
    updateAuthButtons();
  }

  function requireAuth() {
    if (isLoggedIn()) {
      return true;
    }
    openAuthModal("login");
    return false;
  }

  function bindSearchForms() {
    document.querySelectorAll("[data-search-form]").forEach((form) => {
      if (form.dataset.searchBound) {
        return;
      }
      form.dataset.searchBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector('[name="q"]');
        const keyword = input ? input.value.trim() : "";
        if (keyword) {
          trackSearch({ keyword, metadata: { path: window.location.pathname || "/" } });
          window.location.href = `/search_result.html?q=${encodeURIComponent(keyword)}`;
        }
      });
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const modal = document.getElementById("auth-modal");
      if (modal && !modal.classList.contains("hidden")) {
        closeAuthModal();
      }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureAuthModal();
    bindAuthButtons();
    bindSearchForms();
    recordCurrentVisit();
  });

  window.JjamppongAPI = {
    API_BASE_URL,
    ApiError,
    FALLBACK_IMAGE,
    request,
    getRestaurants,
    getRestaurantDetail,
    getRestaurantSentiment,
    getRegions,
    favoriteRestaurant,
    unfavoriteRestaurant,
    login,
    register,
    submitQuestion,
    logVisit,
    logSearch,
    trackVisit,
    trackSearch,
    recordCurrentVisit,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    isLoggedIn,
    requireAuth,
    openAuthModal,
    closeAuthModal,
    bindAuthButtons,
    bindSearchForms,
    unwrapResults,
    renderPagination,
    resolveImageUrl,
    getPrimaryImage,
    regionName,
    soupStyleLabel,
    escapeHtml,
    formatPrice,
    formatScore,
    formatDate,
    spiceBlocks,
  };
})();
