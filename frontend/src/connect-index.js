import { api, formatRank, renderPagination, renderSpiceDots, setupChrome } from "./connect-common.js";

setupChrome();

const rankTabs = Array.from(document.querySelectorAll("main > div")).find(
  (element) => element.textContent.includes("불맛 마스터") && element.querySelectorAll("button").length >= 4
);
const rankingList = document.querySelector("main .grid.grid-cols-1.gap-10");
const paginationHost = document.querySelector("main .mt-margin-lg.text-center");
const tabButtons = rankTabs ? Array.from(rankTabs.querySelectorAll("button")) : [];

const tabConfig = [
  { key: "overall", params: { ordering: "score" } },
  { key: "fire", params: { soup_style: "MEAT", youtube_featured: "true", ordering: "score" } },
  { key: "spicy", params: { min_spice: 4, ordering: "-spice" } },
  { key: "latest", params: { ordering: "latest" } },
];

const searchParams = new URLSearchParams(location.search);
const state = {
  page: Number(searchParams.get("page") || 1),
  rankTab: searchParams.get("rank_tab") || "overall",
};
if (!tabConfig.some((tab) => tab.key === state.rankTab)) {
  state.rankTab = "overall";
}

if (paginationHost) {
  paginationHost.innerHTML = '<div class="flex justify-center items-center gap-4" id="pagination"></div>';
}
const pagination = document.getElementById("pagination");

tabButtons.forEach((button, index) => {
  const config = tabConfig[index] || tabConfig[0];
  button.dataset.rankTab = config.key;
  button.type = "button";
  button.addEventListener("click", () => {
    state.rankTab = config.key;
    state.page = 1;
    loadRanking();
  });
});

function syncUrl() {
  const params = new URLSearchParams();
  if (state.rankTab !== "overall") {
    params.set("rank_tab", state.rankTab);
  }
  if (state.page > 1) {
    params.set("page", state.page);
  }
  history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}`);
}

function setActiveTab() {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.rankTab === state.rankTab;
    button.className = [
      isActive ? "neumorph-sunken text-primary border-2 border-primary/10" : "neumorph-extruded text-on-surface-variant hover:scale-105",
      "px-8 py-3 rounded-full font-headline-lg text-body-md bg-background transition-soft",
    ].join(" ");
  });
}

function renderTags(restaurant) {
  return [
    api.soupStyleLabel(restaurant.soup_style),
    `맵기 ${Number(restaurant.spice_level || 0)}`,
    api.formatPrice(restaurant.average_price),
  ]
    .map((tag) => `<span class="neumorph-sunken px-4 py-1 rounded-full text-label-sm font-label-sm text-primary bg-background">${api.escapeHtml(tag)}</span>`)
    .join("");
}

function renderFeatured(restaurant, index) {
  const rank = formatRank(index, state.page);
  return `
    <a class="neumorph-extruded rounded-lg p-margin-md flex flex-col md:flex-row gap-8 bg-background border-4 border-primary/5 relative overflow-hidden hover:scale-[1.01] transition-soft" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="absolute top-0 left-0 bg-primary text-on-primary px-10 py-2 font-headline-xl text-headline-lg -rotate-12 -translate-x-4 -translate-y-2 shadow-lg">#${rank}</div>
      <div class="w-full md:w-1/3 aspect-video md:aspect-square rounded-lg overflow-hidden neumorph-sunken p-2">
        <img class="w-full h-full object-cover rounded-lg" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
      </div>
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2 gap-6">
            <h2 class="font-headline-xl text-headline-lg text-on-surface">${api.escapeHtml(restaurant.name)}</h2>
            <div class="text-right shrink-0">
              <span class="font-headline-xl text-headline-xl text-primary leading-none">${api.formatScore(restaurant.sentiment_score)}</span>
              <p class="text-label-sm font-label-sm text-primary uppercase tracking-widest">AI 미각 점수</p>
            </div>
          </div>
          <p class="flex items-center gap-1 text-on-surface-variant mb-4 font-body-md">
            <span class="material-symbols-outlined text-primary text-[18px]">location_on</span>
            ${api.escapeHtml(restaurant.address || api.regionName(restaurant))}
          </p>
          <div class="flex flex-wrap gap-2 mb-6">${renderTags(restaurant)}</div>
          <div class="flex items-center gap-4 mb-6">
            <span class="text-label-sm font-label-sm text-on-surface-variant uppercase">맵기 단계:</span>
            <div class="flex gap-2">${renderSpiceDots(restaurant.spice_level, "w-6 h-6", "bg-primary/20 neumorph-sunken")}</div>
            <span class="ml-auto flex items-center gap-1 text-secondary font-bold"><span class="material-symbols-outlined">trending_up</span> 실시간 랭킹</span>
          </div>
        </div>
        <span class="neumorph-extruded w-full md:w-fit px-12 py-4 rounded-lg bg-primary text-on-primary font-headline-lg text-body-md text-center">상세 정보 보기</span>
      </div>
    </a>
  `;
}

function renderMediumCard(restaurant, index) {
  const rank = formatRank(index, state.page);
  return `
    <a class="neumorph-extruded rounded-lg p-margin-sm flex gap-6 bg-background items-center transition-soft hover:scale-[1.01]" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="font-headline-xl text-headline-lg text-primary/30 w-12 text-center">#${rank}</div>
      <div class="w-24 h-24 rounded-lg overflow-hidden neumorph-sunken flex-shrink-0">
        <img class="w-full h-full object-cover" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-headline-lg text-body-md text-on-surface truncate">${api.escapeHtml(restaurant.name)}</h3>
        <p class="text-label-sm text-on-surface-variant mb-2 truncate">${api.escapeHtml(api.regionName(restaurant))}</p>
        <div class="flex gap-1">${renderSpiceDots(restaurant.spice_level)}</div>
      </div>
      <div class="text-right pr-4">
        <div class="font-headline-xl text-body-md font-extrabold text-on-surface">${api.formatScore(restaurant.sentiment_score)}</div>
        <span class="inline-flex neumorph-sunken p-2 rounded-full text-primary mt-2"><span class="material-symbols-outlined text-[18px]">chevron_right</span></span>
      </div>
    </a>
  `;
}

function renderSmallCard(restaurant, index) {
  const rank = formatRank(index, state.page);
  return `
    <a class="neumorph-extruded rounded-lg p-6 bg-background hover:scale-[1.01] transition-soft" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="flex justify-between items-start mb-4">
        <span class="font-headline-xl text-body-md text-primary/20">#${rank}</span>
        <span class="font-headline-xl text-body-md text-on-surface">${api.formatScore(restaurant.sentiment_score)}</span>
      </div>
      <h4 class="font-headline-lg text-body-md text-on-surface mb-1 truncate">${api.escapeHtml(restaurant.name)}</h4>
      <p class="text-label-sm text-on-surface-variant mb-4 truncate">${api.escapeHtml(api.regionName(restaurant))}</p>
      <div class="flex justify-between items-center">
        <span class="flex items-center gap-1 text-secondary text-label-sm"><span class="material-symbols-outlined text-sm">trending_up</span></span>
        <span class="neumorph-extruded px-4 py-2 rounded-full text-primary text-label-sm">상세보기</span>
      </div>
    </a>
  `;
}

function renderRanking(restaurants) {
  if (!restaurants.length) {
    return '<div class="neumorph-sunken rounded-lg p-10 text-center text-on-surface-variant">표시할 식당이 없습니다.</div>';
  }

  const [first, ...rest] = restaurants;
  const medium = rest.slice(0, 2);
  const small = rest.slice(2, 8);

  return [
    renderFeatured(first, 0),
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      ${medium.map((restaurant, index) => renderMediumCard(restaurant, index + 1)).join("")}
      <div class="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${small.map((restaurant, index) => renderSmallCard(restaurant, index + 3)).join("")}
      </div>
    </div>`,
  ].join("");
}

async function loadRanking() {
  if (!rankingList) {
    return;
  }

  setActiveTab();
  syncUrl();
  rankingList.innerHTML = '<div class="neumorph-sunken rounded-lg p-10 text-center text-on-surface-variant">랭킹 데이터를 불러오는 중입니다.</div>';

  try {
    const current = tabConfig.find((tab) => tab.key === state.rankTab) || tabConfig[0];
    const data = await api.getRestaurants({ page: state.page, ...current.params });
    const restaurants = api.unwrapResults(data);
    rankingList.innerHTML = renderRanking(restaurants);
    renderPagination(pagination, data, state.page, (page) => {
      state.page = page;
      loadRanking();
    });
  } catch (error) {
    rankingList.innerHTML = `<div class="neumorph-sunken rounded-lg p-10 text-center text-error">${api.escapeHtml(error.message)}</div>`;
    if (pagination) {
      pagination.innerHTML = "";
    }
  }
}

loadRanking();
