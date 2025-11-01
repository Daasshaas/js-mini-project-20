// ----------------------
// config
// ----------------------
const API_KEY = "52687107-e9492b5d9310c8a2236b74a1d"; // если хочешь использовать другой — замени
const BASE_URL = "https://pixabay.com/api/";
const PER_PAGE = 12;

// ----------------------
// elements
// ----------------------
const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const gallery = document.getElementById("gallery");
const loadMoreBtn = document.getElementById("load-more");
const notifications = document.getElementById("notifications");

// ----------------------
// state
// ----------------------
let currentPage = 1;
let currentQuery = "";
let totalHits = 0;
let isLoading = false;

// ----------------------
// helpers
// ----------------------
function notify(text, type = "info", ttl = 3000) {
  notifications.innerHTML = `<span class="notification ${type}">${text}</span>`;
  if (ttl) setTimeout(() => { notifications.innerHTML = ""; }, ttl);
}

function buildUrl(query, page = 1) {
  return `${BASE_URL}?image_type=photo&orientation=horizontal&q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&key=${API_KEY}`;
}

// escape HTML for alt text
function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ----------------------
// network (async with try/catch)
// ----------------------
async function fetchImages(query, page = 1) {
  try {
    const url = buildUrl(query, page);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    // пробросим дальше, обработаем в performSearch
    throw err;
  }
}

// ----------------------
// rendering
// ----------------------
function renderCards(hits, append = true) {
  const html = hits.map(hit => {
    return `
      <li>
        <div class="photo-card" data-large="${hit.largeImageURL}" title="${escapeHtml(hit.tags)}">
          <img src="${hit.webformatURL}" alt="${escapeHtml(hit.tags)}" loading="lazy" />
          <div class="stats">
            <p class="stats-item"><i class="material-icons">thumb_up</i>${hit.likes}</p>
            <p class="stats-item"><i class="material-icons">visibility</i>${hit.views}</p>
            <p class="stats-item"><i class="material-icons">comment</i>${hit.comments}</p>
            <p class="stats-item"><i class="material-icons">cloud_download</i>${hit.downloads}</p>
          </div>
        </div>
      </li>
    `;
  }).join("");

  if (!append) gallery.innerHTML = html;
  else gallery.insertAdjacentHTML("beforeend", html);
}

function scrollToNewlyLoaded() {
  const items = gallery.querySelectorAll("li");
  if (items.length === 0) return;
  const last = items[items.length - 1];
  last.scrollIntoView({ behavior: "smooth", block: "end" });
}

function resetSearchState() {
  currentPage = 1;
  totalHits = 0;
  gallery.innerHTML = "";
  loadMoreBtn.style.display = "none";
}

// ----------------------
// main logic
// ----------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) {
    notify("Введи ключове слово для пошуку.", "error");
    return;
  }
  currentQuery = q;
  resetSearchState();
  await performSearch(false);
});

loadMoreBtn.addEventListener("click", async () => {
  if (!currentQuery) {
    notify("Спочатку зроби пошук.", "error");
    return;
  }
  await performSearch(true);
});

async function performSearch(append = false) {
  if (isLoading) return;
  isLoading = true;
  loadMoreBtn.disabled = true;
  notify("Завантаження...", "info", 0);

  try {
    const pageToFetch = append ? currentPage + 1 : 1;
    const data = await fetchImages(currentQuery, pageToFetch);

    // validate response
    if (!data || !Array.isArray(data.hits)) {
      throw new Error("Неправильна відповідь API");
    }

    totalHits = data.totalHits || 0;

    if (!append) {
      if (data.hits.length === 0) {
        notify("Нічого не знайдено :(", "info");
        loadMoreBtn.style.display = "none";
        return;
      } else {
        notify(`Знайдено ${totalHits} результатів.`, "info");
      }
      renderCards(data.hits, false);
      currentPage = 1;
    } else {
      // append
      renderCards(data.hits, true);
      currentPage = pageToFetch;
    }

    // show/hide load more
    const loadedSoFar = (currentPage) * PER_PAGE;
    if (loadedSoFar < totalHits) {
      loadMoreBtn.style.display = "inline-block";
      loadMoreBtn.disabled = false;
    } else {
      loadMoreBtn.style.display = "none";
    }

    if (append) {
      // плавний скрол після додавання
      setTimeout(scrollToNewlyLoaded, 120);
    } else {
      // прокрутити до галереї
      gallery.scrollIntoView({ behavior: "smooth", block: "start" });
    }

  } catch (err) {
    console.error(err);
    notify("Помилка при завантаженні. Перевір ключ API та мережу.", "error", 4000);
    loadMoreBtn.disabled = false;
  } finally {
    isLoading = false;
    // уберем "завантаження" через короткий час, якщо оно все ще там
    setTimeout(() => { if (notifications) notifications.innerHTML = ""; }, 800);
  }
}

// ----------------------
// lightbox (кілька рядків) — використовует basicLightbox подключённый в index.html
// ----------------------
gallery.addEventListener("click", (e) => {
  const card = e.target.closest(".photo-card");
  if (!card) return;
  const large = card.dataset.large;
  if (!large) return;
  const instance = basicLightbox.create(`<img src="${large}" width="100%" alt="" />`);
  instance.show();
});

// initial state
loadMoreBtn.style.display = "none";
