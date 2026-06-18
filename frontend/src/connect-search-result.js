import { api, renderPagination, renderSpiceDots, setupChrome } from "./connect-common.js";

setupChrome();

const params = new URLSearchParams(location.search);
const state = {
  q: params.get("q") || "",
  page: Number(params.get("page") || 1),
  regionCode: params.get("region_code") || "",
  soupStyle: params.get("soup_style") || "",
  minSpice: params.get("min_spice") || "",
  priceMode: params.get("price_mode") || "",
};

const resultGrid = document.querySelector(".flex-grow > .grid");
const pagination = document.querySelector(".flex-grow > .mt-section-gap");
const regionSelect = document.querySelector("aside select");
const spiceRange = document.querySelector('aside input[type="range"]');
const applyButton = Array.from(document.querySelectorAll("aside button")).find((button) => button.textContent.includes("검색 결과 반영"));
const soupInputs = Array.from(document.querySelectorAll('aside input[type="checkbox"]'));
const priceButtons = Array.from(document.querySelectorAll("aside .grid button"));

document.querySelectorAll("input[name='q']").forEach((input) => {
  input.value = state.q;
});

let resultMeta = document.getElementById("result-meta");
if (!resultMeta && resultGrid) {
  resultMeta = document.createElement("div");
  resultMeta.id = "result-meta";
  resultMeta.className = "mb-6 flex items-center justify-between border-b border-gray-200 pb-4 text-sm font-bold text-gray-500";
  resultGrid.before(resultMeta);
}

if (resultGrid) {
  resultGrid.id = "search-results";
}
if (pagination) {
  pagination.id = "pagination";
}
if (regionSelect) {
  regionSelect.id = "region-filter";
}
if (spiceRange) {
  spiceRange.id = "spice-filter";
  spiceRange.value = state.minSpice || "1";
  spiceRange.addEventListener("input", () => {
    spiceRange.dataset.changed = "true";
  });
}

const soupValues = ["SEAFOOD", "MEAT", "MIXED"];
soupInputs.forEach((input, index) => {
  input.value = soupValues[index] || "";
  input.checked = input.value === state.soupStyle;
  input.addEventListener("change", () => {
    if (input.checked) {
      soupInputs.forEach((other) => {
        if (other !== input) {
          other.checked = false;
        }
      });
    }
  });
});

priceButtons.forEach((button, index) => {
  button.type = "button";
  button.dataset.priceMode = index === 0 ? "value" : "premium";
  button.addEventListener("click", () => {
    state.priceMode = state.priceMode === button.dataset.priceMode ? "" : button.dataset.priceMode;
    applyPriceButtonState();
  });
});

if (applyButton) {
  applyButton.type = "button";
  applyButton.addEventListener("click", () => {
    state.regionCode = regionSelect ? regionSelect.value : "";
    state.soupStyle = (soupInputs.find((input) => input.checked) || {}).value || "";
    state.minSpice = spiceRange && (spiceRange.dataset.changed || Number(spiceRange.value) > 1) ? spiceRange.value : "";
    state.page = 1;
    loadResults();
  });
}

function applyPriceButtonState() {
  priceButtons.forEach((button) => {
    const active = button.dataset.priceMode === state.priceMode;
    button.classList.toggle("border-2", active);
    button.classList.toggle("border-primary", active);
    button.classList.toggle("text-primary", active);
    button.classList.toggle("bg-primary/5", active);
  });
}

function syncUrl() {
  const next = new URLSearchParams();
  if (state.q) next.set("q", state.q);
  if (state.regionCode) next.set("region_code", state.regionCode);
  if (state.soupStyle) next.set("soup_style", state.soupStyle);
  if (state.minSpice) next.set("min_spice", state.minSpice);
  if (state.priceMode) next.set("price_mode", state.priceMode);
  if (state.page > 1) next.set("page", state.page);
  history.replaceState(null, "", `${location.pathname}${next.toString() ? `?${next}` : ""}`);
}

function buildRequestParams() {
  const requestParams = {
    q: state.q,
    page: state.page,
    region_code: state.regionCode,
    soup_style: state.soupStyle,
    min_spice: state.minSpice,
    ordering: "score",
  };

  if (state.priceMode === "value") {
    requestParams.max_price = 10000;
  }
  if (state.priceMode === "premium") {
    requestParams.min_price = 10000;
  }

  return requestParams;
}

function renderCard(restaurant, index) {
  return `
    <a class="bg-white border border-outline group hover:shadow-2xl transition-all duration-500 overflow-hidden block" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="relative overflow-hidden h-64">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
        ${index === 0 ? '<div class="absolute top-0 left-0 bg-primary text-white px-3 py-1 font-black text-xs">BEST</div>' : ""}
        <div class="absolute bottom-4 right-4 bg-charcoal/90 text-white px-3 py-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-primary text-[16px]" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="font-bold">${api.formatScore(restaurant.sentiment_score)}</span>
        </div>
      </div>
      <div class="p-6">
        <div class="flex justify-between items-start mb-2 gap-4">
          <h2 class="text-xl font-extrabold text-charcoal">${api.escapeHtml(restaurant.name)}</h2>
          <span class="text-primary font-black shrink-0">${api.formatPrice(restaurant.average_price)}</span>
        </div>
        <p class="text-gray-500 text-sm font-medium italic mb-6 line-clamp-2">${api.escapeHtml(restaurant.address || api.regionName(restaurant))}</p>
        <div class="flex flex-wrap gap-2 mb-6">
          <span class="px-2 py-1 bg-gray-100 text-gray-600 font-bold text-[10px] border border-gray-200">AI 신뢰도 ${api.formatScore(restaurant.sentiment_score)}점</span>
          <span class="px-2 py-1 bg-primary text-white font-bold text-[10px]">${api.escapeHtml(api.soupStyleLabel(restaurant.soup_style))}</span>
        </div>
        <div class="flex items-center">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">맵기</span>
          <div class="dotted-leader"></div>
          <span class="flex gap-1">${renderSpiceDots(restaurant.spice_level)}</span>
        </div>
      </div>
    </a>
  `;
}

async function loadRegions() {
  if (!regionSelect) {
    return;
  }
  try {
    const data = await api.getRegions();
    const regions = api.unwrapResults(data);
    regionSelect.innerHTML =
      '<option value="">전국</option>' +
      regions.map((region) => `<option value="${api.escapeHtml(region.code)}">${api.escapeHtml(region.name)}</option>`).join("");
    regionSelect.value = state.regionCode;
  } catch (error) {
    console.warn(error);
  }
}

async function loadResults() {
  if (!resultGrid) {
    return;
  }

  syncUrl();
  applyPriceButtonState();
  resultGrid.innerHTML = '<div class="col-span-full border border-outline bg-white p-10 text-center font-bold text-gray-500">검색 결과를 불러오는 중입니다.</div>';

  try {
    const data = await api.getRestaurants(buildRequestParams());
    const restaurants = api.unwrapResults(data);
    const count = data && data.count !== undefined ? Number(data.count) : restaurants.length;
    if (resultMeta) {
      resultMeta.innerHTML = `<span>${state.q ? `"${api.escapeHtml(state.q)}"` : "전체"} 검색 결과</span><span>${count.toLocaleString("ko-KR")}곳</span>`;
    }
    resultGrid.innerHTML = restaurants.length
      ? restaurants.map(renderCard).join("")
      : '<div class="col-span-full border border-outline bg-white p-10 text-center font-bold text-gray-500">검색 결과가 없습니다.</div>';
    renderPagination(pagination, data, state.page, (page) => {
      state.page = page;
      loadResults();
    });
  } catch (error) {
    resultGrid.innerHTML = `<div class="col-span-full border border-outline bg-white p-10 text-center font-bold text-primary">${api.escapeHtml(error.message)}</div>`;
    if (pagination) {
      pagination.innerHTML = "";
    }
  }
}

loadRegions();
loadResults();

