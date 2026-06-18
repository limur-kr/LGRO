import "./api.js";

export const api = window.JjamppongAPI;

export function setupChrome() {
  document.querySelectorAll('a[href="/"]').forEach((link) => {
    link.setAttribute("href", "index.html");
  });

  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent.trim() === "로그인") {
      button.setAttribute("type", "button");
      button.dataset.authButton = "true";
    }
  });

  document.querySelectorAll("input").forEach((input) => {
    const placeholder = input.getAttribute("placeholder") || "";
    const isSearch = placeholder.includes("검색") || placeholder.toLowerCase().includes("search");
    if (!isSearch) {
      return;
    }

    input.name = input.name || "q";
    if (input.type === "text") {
      input.type = "search";
    }

    const form = input.closest("form");
    if (form) {
      form.dataset.searchForm = "true";
      return;
    }

    if (input.dataset.searchInputBound) {
      return;
    }
    input.dataset.searchInputBound = "true";
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        goToSearch(input.value.trim());
      }
    });
  });

  api.bindAuthButtons();
  api.bindSearchForms();
}

export function goToSearch(keyword) {
  if (!keyword) {
    return;
  }
  api.trackSearch({ keyword, metadata: { path: window.location.pathname || "/" } });
  window.location.href = `search_result.html?q=${encodeURIComponent(keyword)}`;
}

export function formatRank(index, page = 1, pageSize = 20) {
  return (Math.max(1, Number(page || 1)) - 1) * pageSize + index + 1;
}

export function renderSpiceDots(level, sizeClass = "w-3 h-3", inactiveClass = "bg-primary/20") {
  const current = Math.max(0, Math.min(5, Number(level || 0)));
  return Array.from({ length: 5 }, (_, index) => {
    const color = index < current ? "bg-primary" : inactiveClass;
    return `<span class="${sizeClass} rounded-full ${color}"></span>`;
  }).join("");
}

export function renderPagination(container, data, currentPage, onPageChange) {
  if (!container) {
    return;
  }

  const count = data && Number(data.count);
  const results = api.unwrapResults(data);
  const pageSize = data && Array.isArray(data.results) ? 20 : results.length || 20;
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
    `<button type="button" data-page="${Math.max(1, page - 1)}" class="w-12 h-12 flex items-center justify-center border border-gray-200 hover:border-primary text-on-surface transition-all ${page === 1 ? "opacity-40 cursor-not-allowed" : ""}"><span class="material-symbols-outlined">chevron_left</span></button>`,
    ...pages.map(
      (number) =>
        `<button type="button" data-page="${number}" class="text-sm font-black transition-all px-2 ${
          number === page ? "text-primary border-b-2 border-primary" : "text-gray-400 hover:text-on-surface"
        }">${String(number).padStart(2, "0")}</button>`
    ),
    `<button type="button" data-page="${Math.min(totalPages, page + 1)}" class="w-12 h-12 flex items-center justify-center border border-gray-200 hover:border-primary text-on-surface transition-all ${page === totalPages ? "opacity-40 cursor-not-allowed" : ""}"><span class="material-symbols-outlined">chevron_right</span></button>`,
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
