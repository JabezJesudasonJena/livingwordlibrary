const API_BASE = "/api";
const TOKEN_KEY = "library_token";
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300">
    <rect width="100%" height="100%" fill="#eef2f7"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="Segoe UI" font-size="20">No Cover</text>
  </svg>`
)}`;

const DOM = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  authForm: document.getElementById("authForm"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  nameField: document.getElementById("nameField"),
  name: document.getElementById("name"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  booksGrid: document.getElementById("booksGrid"),
  recentBooks: document.getElementById("recentBooks"),
  searchInput: document.getElementById("searchInput"),
  addBookBtn: document.getElementById("addBookBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  bookModal: document.getElementById("bookModal"),
  modalTitle: document.getElementById("modalTitle"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  bookForm: document.getElementById("bookForm"),
  bookTitle: document.getElementById("bookTitle"),
  bookAuthor: document.getElementById("bookAuthor"),
  bookDescription: document.getElementById("bookDescription"),
  bookImage: document.getElementById("bookImage"),
  imagePreview: document.getElementById("imagePreview"),
  deleteBookBtn: document.getElementById("deleteBookBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  toast: document.getElementById("toast")
};

// Guard against null references so missing markup does not crash all scripts.
const requiredElements = Object.entries(DOM)
  .filter(([, element]) => !element)
  .map(([name]) => name);

if (requiredElements.length) {
  console.error("Missing required DOM elements:", requiredElements.join(", "));
}

const state = {
  authMode: "login",
  books: [],
  booksById: new Map(),
  activeBook: null,
  searchTerm: ""
};

let searchTimer = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showToast(message) {
  if (!DOM.toast) return;
  DOM.toast.textContent = message;
  DOM.toast.classList.remove("hidden");
  setTimeout(() => DOM.toast.classList.add("hidden"), 2400);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Invalid server response");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function switchAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  DOM.loginTab.classList.toggle("active", !isRegister);
  DOM.registerTab.classList.toggle("active", isRegister);
  DOM.nameField.classList.toggle("hidden", !isRegister);
  DOM.authSubmitBtn.textContent = isRegister ? "Register" : "Login";
}

function showApp() {
  DOM.authSection.classList.add("hidden");
  DOM.appSection.classList.remove("hidden");
}

function showAuth() {
  DOM.appSection.classList.add("hidden");
  DOM.authSection.classList.remove("hidden");
}

function attachImageFallbacks(scope) {
  const images = scope.querySelectorAll("img.book-cover");
  images.forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.src = PLACEHOLDER_IMAGE;
      },
      { once: true }
    );
  });
}

function renderBooks() {
  if (!state.books.length) {
    DOM.booksGrid.innerHTML = `<p class="empty-text">No books found.</p>`;
    return;
  }

  const html = state.books
    .map(
      (book) => `
        <article class="book-card" data-id="${book.id}" tabindex="0">
          <img class="book-cover" src="${book.image_url || PLACEHOLDER_IMAGE}" alt="${escapeHtml(
            book.title
          )}" loading="lazy" />
          <div class="book-meta">
            <p class="book-title">${escapeHtml(book.title)}</p>
            <p class="book-author">${escapeHtml(book.author)}</p>
          </div>
        </article>
      `
    )
    .join("");

  DOM.booksGrid.innerHTML = html;
  attachImageFallbacks(DOM.booksGrid);
}

function renderRecentBooks() {
  const latestBooks = state.books.slice(0, 5);
  if (!latestBooks.length) {
    DOM.recentBooks.innerHTML = `<p class="empty-text">No recent books.</p>`;
    return;
  }

  DOM.recentBooks.innerHTML = latestBooks
    .map(
      (book) =>
        `<span class="recent-item">${escapeHtml(book.title)} - ${escapeHtml(
          book.author
        )}</span>`
    )
    .join("");
}

function openModal(book = null) {
  state.activeBook = book;
  DOM.modalTitle.textContent = book ? "Edit Book" : "Add Book";
  DOM.deleteBookBtn.classList.toggle("hidden", !book);

  DOM.bookTitle.value = book?.title || "";
  DOM.bookAuthor.value = book?.author || "";
  DOM.bookDescription.value = book?.description || "";
  DOM.bookImage.value = "";

  if (book?.image_url) {
    DOM.imagePreview.src = book.image_url;
    DOM.imagePreview.classList.remove("hidden");
  } else {
    DOM.imagePreview.src = "";
    DOM.imagePreview.classList.add("hidden");
  }

  DOM.bookModal.classList.remove("hidden");
  DOM.bookModal.setAttribute("aria-hidden", "false");
  DOM.bookTitle.focus();
}

function closeModal() {
  state.activeBook = null;
  DOM.bookModal.classList.add("hidden");
  DOM.bookModal.setAttribute("aria-hidden", "true");
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateBooksState(books) {
  state.books = books;
  state.booksById = new Map(books.map((book) => [Number(book.id), book]));
}

async function fetchBooks(searchTerm = state.searchTerm) {
  state.searchTerm = searchTerm.trim();
  const query = state.searchTerm
    ? `?search=${encodeURIComponent(state.searchTerm)}`
    : "";
  const response = await apiRequest(`/books${query}`, { method: "GET" });
  updateBooksState(response.data);
  renderBooks();
  renderRecentBooks();
}

function getBookCardFromEventTarget(target) {
  if (!(target instanceof Element)) return null;
  const card = target.closest(".book-card[data-id]");
  if (!card || !DOM.booksGrid.contains(card)) return null;
  return card;
}

function attachEventListeners() {
  DOM.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = DOM.name.value.trim();
    const email = DOM.email.value.trim();
    const password = DOM.password.value;

    try {
      const endpoint =
        state.authMode === "register" ? "/auth/register" : "/auth/login";
      const body =
        state.authMode === "register"
          ? { name, email, password }
          : { email, password };

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });

      setToken(response.data.token);
      showApp();
      await fetchBooks("");
      showToast(response.message);
    } catch (error) {
      showToast(error.message);
    }
  });

  DOM.loginTab.addEventListener("click", () => switchAuthMode("login"));
  DOM.registerTab.addEventListener("click", () => switchAuthMode("register"));

  DOM.searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchBooks(DOM.searchInput.value).catch((error) => showToast(error.message));
    }, 250);
  });

  DOM.addBookBtn.addEventListener("click", () => openModal());
  DOM.logoutBtn.addEventListener("click", () => {
    clearToken();
    showAuth();
    showToast("Logged out");
  });

  DOM.cancelModalBtn.addEventListener("click", closeModal);
  DOM.closeModalBtn.addEventListener("click", closeModal);
  DOM.bookModal.addEventListener("click", (event) => {
    if (event.target === DOM.bookModal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !DOM.bookModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Event delegation keeps card clicks working even after grid re-renders.
  DOM.booksGrid.addEventListener("click", (event) => {
    const card = getBookCardFromEventTarget(event.target);
    if (!card) return;

    const bookId = Number(card.dataset.id);
    if (!Number.isInteger(bookId)) return;

    const selectedBook = state.booksById.get(bookId);
    if (selectedBook) openModal(selectedBook);
  });

  DOM.booksGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = getBookCardFromEventTarget(event.target);
    if (!card) return;

    event.preventDefault();
    const bookId = Number(card.dataset.id);
    const selectedBook = state.booksById.get(bookId);
    if (selectedBook) openModal(selectedBook);
  });

  DOM.bookImage.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      if (state.activeBook?.image_url) {
        DOM.imagePreview.src = state.activeBook.image_url;
        DOM.imagePreview.classList.remove("hidden");
      } else {
        DOM.imagePreview.src = "";
        DOM.imagePreview.classList.add("hidden");
      }
      return;
    }

    DOM.imagePreview.src = await fileToDataUrl(file);
    DOM.imagePreview.classList.remove("hidden");
  });

  DOM.bookForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = DOM.bookTitle.value.trim();
    const author = DOM.bookAuthor.value.trim();
    const description = DOM.bookDescription.value.trim();
    const file = DOM.bookImage.files?.[0];

    if (!title || !author) {
      showToast("Title and author are required");
      return;
    }

    try {
      let imageData = null;
      if (file) imageData = await fileToDataUrl(file);

      const payload = {
        title,
        author,
        description,
        image_url: state.activeBook?.image_url || null
      };
      if (imageData) payload.image_data = imageData;

      if (state.activeBook) {
        await apiRequest(`/books/${state.activeBook.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showToast("Book updated");
      } else {
        await apiRequest("/books", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("Book added");
      }

      closeModal();
      await fetchBooks(DOM.searchInput.value);
    } catch (error) {
      showToast(error.message);
    }
  });

  DOM.deleteBookBtn.addEventListener("click", async () => {
    if (!state.activeBook) return;

    const confirmed = window.confirm(`Delete "${state.activeBook.title}"?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/books/${state.activeBook.id}`, { method: "DELETE" });
      closeModal();
      await fetchBooks(DOM.searchInput.value);
      showToast("Book deleted");
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function bootstrap() {
  if (requiredElements.length) return;

  switchAuthMode("login");

  if (!getToken()) {
    showAuth();
    return;
  }

  try {
    showApp();
    await fetchBooks("");
  } catch (error) {
    clearToken();
    showAuth();
  }
}

if (!requiredElements.length) {
  attachEventListeners();
  bootstrap();
}
