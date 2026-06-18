import { api, renderSpiceDots, setupChrome } from "./connect-common.js";

setupChrome();

const root = document.querySelector("main");
const params = new URLSearchParams(location.search);
let restaurantId = params.get("id") || "";

function aspectLabel(detail) {
  return (
    detail.label ||
    {
      soup: "국물",
      spiciness: "매운맛",
      fire: "불향",
      noodle: "면",
      topping: "토핑",
      quantity: "양",
      price: "가격",
      waiting: "대기",
      hygiene: "위생",
      service: "서비스",
      return_intent: "재방문",
    }[detail.aspect] ||
    detail.aspect
  );
}

function renderAspectScores(sentiment) {
  const details = sentiment && (sentiment.aspect_scores || sentiment.aspect_details);
  if (!Array.isArray(details) || !details.length) {
    return '<div class="p-6 brutalist-border text-on-surface-variant">세부 감성 점수가 없습니다.</div>';
  }

  return details
    .slice(0, 6)
    .map((detail) => {
      const score = Math.max(0, Math.min(100, Number(detail.score || 0)));
      return `
        <div>
          <div class="flex justify-between mb-2">
            <span class="font-label-caps text-label-caps">${api.escapeHtml(aspectLabel(detail))}</span>
            <span class="font-label-caps text-label-caps text-primary">${score}</span>
          </div>
          <div class="h-3 bg-surface-variant border border-outline-variant">
            <div class="h-full bg-primary" style="width: ${score}%"></div>
          </div>
          ${detail.summary ? `<p class="mt-2 text-body-sm text-on-surface-variant">${api.escapeHtml(detail.summary)}</p>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderKeywords(sentiment) {
  const keywords = sentiment && Array.isArray(sentiment.keywords) ? sentiment.keywords : [];
  if (!keywords.length) {
    return '<span class="font-body-lg text-on-surface-variant">키워드 데이터가 없습니다.</span>';
  }

  return keywords
    .slice(0, 12)
    .map((keyword, index) => {
      const size = index < 3 ? "font-title-md uppercase" : "font-body-lg";
      const color = keyword.sentiment === "negative" ? "text-error" : index % 2 ? "text-on-surface-variant" : "text-primary";
      return `<span class="${size} ${color}">${api.escapeHtml(keyword.keyword)}</span>`;
    })
    .join("");
}

function renderGallery(restaurant) {
  const images = Array.isArray(restaurant.images) ? restaurant.images : [];
  const gallery = images.length ? images.slice(0, 3) : [{ image_url: api.getPrimaryImage(restaurant), caption: restaurant.name }];

  return gallery
    .map(
      (image) => `
        <div class="aspect-square brutalist-border overflow-hidden diffused-shadow">
          <img alt="${api.escapeHtml(image.caption || restaurant.name)}" class="w-full h-full object-cover" src="${api.resolveImageUrl(image.image_url || image.image)}" />
        </div>
      `
    )
    .join("");
}

function renderMenus(restaurant) {
  const menus = Array.isArray(restaurant.menus) ? restaurant.menus : [];
  if (!menus.length) {
    return '<div class="p-6 brutalist-border text-on-surface-variant">등록된 메뉴가 없습니다.</div>';
  }

  return menus
    .slice(0, 4)
    .map(
      (menu) => `
        <div class="p-6 brutalist-border">
          <div class="flex justify-between gap-4">
            <h3 class="font-title-md">${api.escapeHtml(menu.name)}</h3>
            <span class="font-label-caps text-label-caps text-primary">${api.formatPrice(menu.price)}</span>
          </div>
          ${menu.description ? `<p class="mt-3 font-body-sm text-on-surface-variant">${api.escapeHtml(menu.description)}</p>` : ""}
        </div>
      `
    )
    .join("");
}

function saveButtonClass(isFavorite) {
  return [
    "brutalist-border py-8 text-center transition-all group",
    isFavorite ? "bg-on-background text-white" : "hover:bg-on-background hover:text-white",
  ].join(" ");
}

function renderSaveButton(restaurant) {
  const isFavorite = Boolean(restaurant.is_favorite);
  return `
    <button class="${saveButtonClass(isFavorite)}" type="button" data-save-button data-saved="${isFavorite ? "true" : "false"}" aria-pressed="${isFavorite ? "true" : "false"}">
      <span class="material-symbols-outlined block text-3xl mb-2 group-hover:scale-110 transition-transform" data-save-icon>${isFavorite ? "bookmark_added" : "bookmark"}</span>
      <span class="font-label-caps text-label-caps" data-save-label>${isFavorite ? "SAVED" : "SAVE"}</span>
    </button>
  `;
}

function updateSaveButton(button, isFavorite, isLoading) {
  const icon = button.querySelector("[data-save-icon]");
  const label = button.querySelector("[data-save-label]");
  button.dataset.saved = isFavorite ? "true" : "false";
  button.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  button.disabled = Boolean(isLoading);
  button.className = saveButtonClass(isFavorite);
  button.classList.toggle("opacity-70", Boolean(isLoading));
  button.classList.toggle("cursor-wait", Boolean(isLoading));
  if (icon) {
    icon.textContent = isLoading ? "progress_activity" : isFavorite ? "bookmark_added" : "bookmark";
  }
  if (label) {
    label.textContent = isLoading ? "SAVING" : isFavorite ? "SAVED" : "SAVE";
  }
}

function bindActions(restaurant) {
  const saveButton = root.querySelector("[data-save-button]");
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      if (!api.requireAuth()) {
        return;
      }

      const wasFavorite = saveButton.dataset.saved === "true";
      updateSaveButton(saveButton, wasFavorite, true);
      try {
        const result = wasFavorite
          ? await api.unfavoriteRestaurant(restaurant.id)
          : await api.favoriteRestaurant(restaurant.id);
        updateSaveButton(saveButton, Boolean(result.is_favorite), false);
      } catch (error) {
        updateSaveButton(saveButton, wasFavorite, false);
        if (error.status === 401) {
          api.openAuthModal("login");
          return;
        }
        const label = saveButton.querySelector("[data-save-label]");
        if (label) {
          label.textContent = "ERROR";
        }
      }
    });
  }

  const shareButton = root.querySelector("[data-share-button]");
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        shareButton.querySelector("[data-share-label]").textContent = "COPIED";
        setTimeout(() => {
          shareButton.querySelector("[data-share-label]").textContent = "SHARE";
        }, 1200);
      } catch (error) {
        console.warn(error);
      }
    });
  }
}

function renderPage(restaurant, sentiment) {
  const insight = (sentiment && (sentiment.summary || sentiment.ai_one_liner)) || restaurant.description || "아직 요약 분석이 없습니다.";
  const primaryMenu = Array.isArray(restaurant.menus) && restaurant.menus[0] ? restaurant.menus[0].name : api.soupStyleLabel(restaurant.soup_style);

  root.innerHTML = `
    <section class="asymmetric-grid grid gap-gutter">
      <div class="space-y-12">
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <span class="font-label-caps text-label-caps bg-primary text-white px-3 py-0.5">${api.escapeHtml(api.regionName(restaurant))}</span>
            <span class="font-label-caps text-label-caps border border-outline px-3 py-0.5">${api.escapeHtml(api.soupStyleLabel(restaurant.soup_style))}</span>
          </div>
          <h1 class="font-display-hero text-display-hero uppercase">${api.escapeHtml(restaurant.name)}</h1>
          <p class="font-title-md text-on-surface-variant max-w-xl">${api.escapeHtml(restaurant.address || "주소 미상")}</p>
        </div>
        <div class="grid grid-cols-2 gap-12 border-t border-outline pt-12 max-w-2xl">
          <div>
            <span class="font-label-caps text-label-caps block mb-4 text-primary">RELIABILITY SCORE</span>
            <div class="flex items-baseline gap-2">
              <span class="text-6xl font-black">${api.formatScore(restaurant.sentiment_score)}</span>
              <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">verified</span>
            </div>
          </div>
          <div>
            <span class="font-label-caps text-label-caps block mb-4 text-on-surface-variant">SPICINESS</span>
            <div class="flex gap-2 pt-5">${renderSpiceDots(restaurant.spice_level, "w-5 h-5")}</div>
          </div>
        </div>
      </div>
      <div class="relative">
        <div class="aspect-[3/4] brutalist-border overflow-hidden diffused-shadow">
          <img alt="${api.escapeHtml(restaurant.name)}" class="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" src="${api.getPrimaryImage(restaurant)}" />
        </div>
        <div class="absolute -bottom-8 -left-8 bg-primary p-12 text-white w-64 brutalist-border hidden lg:block">
          <span class="font-label-caps text-label-caps block mb-2 opacity-80">SIGNATURE DISH</span>
          <span class="font-title-md leading-tight">${api.escapeHtml(primaryMenu)}</span>
        </div>
      </div>
    </section>

    <section class="space-y-12">
      <div class="flex justify-between items-end border-b border-outline pb-6">
        <h2 class="font-headline-lg uppercase">AI Analytical Report</h2>
        <span class="font-label-caps text-label-caps text-on-surface-variant">LAST UPDATE: ${api.formatDate(sentiment && (sentiment.analyzed_at || sentiment.created_at))}</span>
      </div>
      <div class="grid lg:grid-cols-3 gap-gutter items-stretch">
        <div class="lg:col-span-1 p-10 brutalist-border bg-white diffused-shadow flex flex-col justify-center gap-6">
          <span class="font-label-caps text-label-caps text-on-surface-variant">SENTIMENT DIMENSIONS</span>
          ${renderAspectScores(sentiment)}
        </div>
        <div class="lg:col-span-2 space-y-12">
          <div class="grid md:grid-cols-2 gap-8">
            <div class="p-8 brutalist-border">
              <span class="font-label-caps text-label-caps text-primary block mb-6">DOMINANT KEYWORDS</span>
              <div class="flex flex-wrap gap-4">${renderKeywords(sentiment)}</div>
            </div>
            <div class="p-8 brutalist-border bg-on-background text-white">
              <span class="font-label-caps text-label-caps text-primary block mb-6">AI QUICK INSIGHT</span>
              <p class="font-body-sm leading-relaxed opacity-90 italic">${api.escapeHtml(insight)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid lg:grid-cols-12 gap-gutter">
      <div class="lg:col-span-8 space-y-12">
        <div class="flex justify-between items-end border-b border-outline pb-6">
          <h2 class="font-headline-lg uppercase">Menu</h2>
        </div>
        <div class="grid md:grid-cols-2 gap-8">${renderMenus(restaurant)}</div>
        <div class="space-y-8 pt-12">
          <div class="flex justify-between items-end border-b border-outline pb-6">
            <h2 class="font-headline-lg uppercase">Gallery</h2>
          </div>
          <div class="grid grid-cols-3 gap-6">${renderGallery(restaurant)}</div>
        </div>
      </div>
      <aside class="lg:col-span-4 space-y-12">
        <div class="grid grid-cols-2 gap-4">
          <button class="brutalist-border py-8 text-center hover:bg-primary hover:text-white transition-all group" type="button" data-share-button>
            <span class="material-symbols-outlined block text-3xl mb-2 group-hover:scale-110 transition-transform">share</span>
            <span class="font-label-caps text-label-caps" data-share-label>SHARE</span>
          </button>
          ${renderSaveButton(restaurant)}
        </div>
        <div class="p-10 brutalist-border space-y-10">
          <div class="space-y-6">
            <h3 class="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">LOCATION</h3>
            <p class="font-body-sm text-on-surface-variant">${api.escapeHtml([restaurant.address, restaurant.detail_address].filter(Boolean).join(" ") || "주소 미상")}</p>
            <a class="w-full py-4 brutalist-border font-label-caps text-label-caps hover:bg-surface-variant transition-all flex items-center justify-center gap-3" href="map.html">
              GET DIRECTIONS <span class="material-symbols-outlined">directions</span>
            </a>
          </div>
          <div class="space-y-6">
            <h3 class="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant pb-2">OPERATING HOURS</h3>
            <div class="space-y-2">
              <p class="font-title-md whitespace-pre-line">${api.escapeHtml(restaurant.opening_hours || "등록된 영업시간이 없습니다.")}</p>
              <p class="font-body-sm text-on-surface-variant">${api.escapeHtml(restaurant.phone || "전화번호 미상")}</p>
            </div>
          </div>
          <div class="pt-10 border-t border-outline-variant">
            <a class="w-full py-4 bg-on-background text-white font-label-caps text-label-caps flex items-center justify-center gap-3 hover:bg-black transition-all" href="report.html">
              REPORT ERROR <span class="material-symbols-outlined">campaign</span>
            </a>
          </div>
        </div>
      </aside>
    </section>
  `;

  bindActions(restaurant);
}

async function resolveRestaurantId() {
  if (restaurantId) {
    return restaurantId;
  }

  const data = await api.getRestaurants({ ordering: "score" });
  const first = api.unwrapResults(data)[0];
  if (!first) {
    return "";
  }

  restaurantId = first.id;
  history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(restaurantId)}`);
  return restaurantId;
}

async function loadPage() {
  if (!root) {
    return;
  }

  root.innerHTML = '<div class="brutalist-border p-10 text-center text-on-surface-variant">식당 상세 데이터를 불러오는 중입니다.</div>';

  try {
    const id = await resolveRestaurantId();
    if (!id) {
      root.innerHTML = '<div class="brutalist-border p-10 text-center text-on-surface-variant">표시할 식당이 없습니다.</div>';
      return;
    }

    const restaurant = await api.getRestaurantDetail(id);
    let sentiment = null;
    try {
      sentiment = await api.getRestaurantSentiment(id);
    } catch (error) {
      if (error.status !== 404) {
        console.warn(error);
      }
    }
    renderPage(restaurant, sentiment);
  } catch (error) {
    root.innerHTML = `<div class="brutalist-border p-10 text-center text-error">${api.escapeHtml(error.message)}</div>`;
  }
}

loadPage();

