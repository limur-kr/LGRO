import { api, setupChrome } from "./connect-common.js";

setupChrome();

const buttons = Array.from(document.querySelectorAll("button"));
const heroExplore = buttons.find((button) => button.textContent.includes("지금 탐험하기"));
const heroReport = buttons.find((button) => button.textContent.includes("데이터 리포트 보기"));
const mapButton = buttons.find((button) => button.textContent.includes("전체 지도 보기"));
const fabButton = buttons.find((button) => button.textContent.includes("REPORT NEW SPOT"));

if (heroExplore) {
  heroExplore.type = "button";
  heroExplore.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}
if (heroReport) {
  heroReport.type = "button";
  heroReport.addEventListener("click", () => {
    window.location.href = "search_result.html";
  });
}
if (mapButton) {
  mapButton.type = "button";
  mapButton.addEventListener("click", () => {
    window.location.href = "map.html";
  });
}
if (fabButton) {
  fabButton.type = "button";
  fabButton.addEventListener("click", () => {
    window.location.href = "report.html";
  });
}

const quickLinks = Array.from(document.querySelectorAll("section a")).filter((link) => link.textContent.includes("MATCHING") || link.textContent.includes("HEAT") || link.textContent.includes("NEARBY"));
if (quickLinks[0]) quickLinks[0].href = "search_result.html?soup_style=MEAT";
if (quickLinks[1]) quickLinks[1].href = "search_result.html?min_spice=4";
if (quickLinks[2]) quickLinks[2].href = "map.html";

const rankingSection = Array.from(document.querySelectorAll("section")).find((section) => section.textContent.includes("실시간 인기 짬뽕집"));
const rankingGrid = rankingSection
  ? Array.from(rankingSection.querySelectorAll(".grid")).find((element) => element.className.includes("md:grid-cols-12"))
  : null;

function renderPrimary(restaurant) {
  return `
    <a class="md:col-span-8 group relative rounded-2xl overflow-hidden h-[500px] shadow-lg block" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      <div class="absolute top-6 left-6 bg-flame-red text-white px-6 py-2 rounded-full font-serif-premium text-xl">NO. 1</div>
      <div class="absolute bottom-10 left-10 text-white">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-tertiary-fixed text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="font-label-caps text-sm tracking-widest">AI ${api.formatScore(restaurant.sentiment_score)}</span>
        </div>
        <h3 class="font-serif-premium text-4xl mb-2">${api.escapeHtml(restaurant.name)}</h3>
        <p class="font-body-lg opacity-80">${api.escapeHtml(api.regionName(restaurant))} | ${api.escapeHtml(api.soupStyleLabel(restaurant.soup_style))}</p>
      </div>
    </a>
  `;
}

function renderSecondary(restaurant, rank) {
  return `
    <a class="md:col-span-4 group relative rounded-2xl overflow-hidden h-[500px] shadow-lg bg-forest-green block" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="h-1/2 overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
      </div>
      <div class="p-8 text-cream-beige">
        <div class="font-serif-premium text-xl mb-1">NO. ${rank}</div>
        <h3 class="font-serif-premium text-2xl mb-3">${api.escapeHtml(restaurant.name)}</h3>
        <p class="font-body-sm opacity-70 mb-6">${api.escapeHtml(api.regionName(restaurant))} | ${api.escapeHtml(restaurant.address || "주소 미상")}</p>
        <div class="flex items-center justify-between border-t border-white/10 pt-4">
          <span class="font-label-caps text-xs">SPICINESS: LEVEL ${Number(restaurant.spice_level || 0)}</span>
          <span class="material-symbols-outlined">trending_up</span>
        </div>
      </div>
    </a>
  `;
}

function renderCompact(restaurant, rank) {
  return `
    <a class="md:col-span-4 bg-cream-beige p-6 rounded-2xl border border-outline/10 flex items-center gap-6 group hover:bg-white hover:shadow-xl transition-all" href="reviews.html?id=${encodeURIComponent(restaurant.id)}">
      <div class="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
        <img class="w-full h-full object-cover" src="${api.getPrimaryImage(restaurant)}" alt="${api.escapeHtml(restaurant.name)}" />
      </div>
      <div class="min-w-0">
        <div class="font-serif-premium text-lg text-flame-red">NO. ${rank}</div>
        <h4 class="font-serif-premium text-xl truncate">${api.escapeHtml(restaurant.name)}</h4>
        <p class="font-body-sm text-secondary truncate">${api.escapeHtml(api.regionName(restaurant))}</p>
      </div>
    </a>
  `;
}

function updateStats(data, restaurants) {
  const count = data && data.count !== undefined ? Number(data.count) : restaurants.length;
  const scores = restaurants.map((restaurant) => Number(restaurant.sentiment_score || 0)).filter(Boolean);
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

  const statNumbers = Array.from(document.querySelectorAll(".font-label-caps.text-tertiary-fixed.text-3xl"));
  if (statNumbers[0]) {
    statNumbers[0].textContent = `${count.toLocaleString("ko-KR")}곳`;
  }
  if (statNumbers[1]) {
    statNumbers[1].textContent = api.formatScore(average);
  }

  const verified = Array.from(document.querySelectorAll(".font-serif-premium.text-3xl")).find((element) =>
    element.parentElement && element.parentElement.textContent.includes("Verified Locations")
  );
  if (verified) {
    verified.textContent = count.toLocaleString("ko-KR");
  }
}

async function loadHomeRanking() {
  if (!rankingGrid) {
    return;
  }

  rankingGrid.innerHTML = '<div class="md:col-span-12 rounded-2xl bg-cream-beige p-10 text-center text-secondary">실시간 랭킹을 불러오는 중입니다.</div>';

  try {
    const data = await api.getRestaurants({ ordering: "score" });
    const restaurants = api.unwrapResults(data).slice(0, 5);
    updateStats(data, restaurants);

    if (!restaurants.length) {
      rankingGrid.innerHTML = '<div class="md:col-span-12 rounded-2xl bg-cream-beige p-10 text-center text-secondary">표시할 식당이 없습니다.</div>';
      return;
    }

    const [first, second, ...rest] = restaurants;
    rankingGrid.innerHTML = [
      first ? renderPrimary(first) : "",
      second ? renderSecondary(second, 2) : "",
      ...rest.map((restaurant, index) => renderCompact(restaurant, index + 3)),
    ].join("");
  } catch (error) {
    rankingGrid.innerHTML = `<div class="md:col-span-12 rounded-2xl bg-cream-beige p-10 text-center text-flame-red">${api.escapeHtml(error.message)}</div>`;
  }
}

loadHomeRanking();

