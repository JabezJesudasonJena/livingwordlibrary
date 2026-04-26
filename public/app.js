const API_BASE = "/api";
const TOKEN_KEY = "library_token";
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">
    <rect width="100%" height="100%" fill="#eef2f7"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7a8397" font-family="Segoe UI" font-size="20">No Image</text>
  </svg>`
)}`;

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const nameField = document.getElementById("nameField");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const booksGrid = document.getElementById("booksGrid");
const recentBooks = document.getElementById("recentBooks");
const searchInput = document.getElementById("searchInput");
const addBookBtn = document.getElementById("addBookBtn");
const logoutBtn = document.getElementById("logoutBtn");
const bookModal = document.getElementById("bookModal");
const modalTitle = document.getElementById("modalTitle");
const bookForm = document.getElementById("bookForm");
const deleteBookBtn = document.getElementById("deleteBookBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const imagePreview = document.getElementById("imagePreview");
const toast = document.getElementById("toast");

let authMode = "login";
let books = [];
let activeBook = null;

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
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2400);
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function switchAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";
  loginTab.classList.toggle("active", !isRegister);
  registerTab.classList.toggle("active", isRegister);
  nameField.classList.toggle("hidden", !isRegister);
  authSubmitBtn.textContent = isRegister ? "Register" : "Login";
}

function renderBooks(items) {
  if (!items.length) {
    booksGrid.innerHTML = `<p class="empty-text">No books found.</p>`;
    return;
  }

  booksGrid.innerHTML = items
    .map(
      (book) => `
      <article class="book-card" data-id="${book.id}">
        <img src="${book.image_url || PLACEHOLDER_IMAGE}" alt="${book.title}" />
        <div class="book-meta">
          <p class="book-title">${escapeHtml(book.title)}</p>
          <p class="book-author">${escapeHtml(book.author)}</p>
        </div>
      </article>
    `
    )
    .join("");
}

function renderRecent(items) {
  const latest = items.slice(0, 5);
  if (!latest.length) {
    recentBooks.innerHTML = `<p class="empty-text">No recent books.</p>`;
    return;
  }

  recentBooks.innerHTML = latest
    .map(
      (book) =>
        `<span class="recent-item">${escapeHtml(book.title)} - ${escapeHtml(
          book.author
        )}</span>`
    )
    .join("");
}

function openModal(book = null) {
  activeBook = book;
  modalTitle.textContent = book ? "Edit Book" : "Add Book";
  deleteBookBtn.classList.toggle("hidden", !book);

  document.getElementById("bookTitle").value = book?.title || "";
  document.getElementById("bookAuthor").value = book?.author || "";
  document.getElementById("bookDescription").value = book?.description || "";
  document.getElementById("bookImage").value = "";

  if (book?.image_url) {
    imagePreview.src = book.image_url;
    imagePreview.classList.remove("hidden");
  } else {
    imagePreview.classList.add("hidden");
  }

  bookModal.classList.remove("hidden");
}

function closeModal() {
  activeBook = null;
  bookModal.classList.add("hidden");
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fetchBooks(search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const response = await apiRequest(`/books${query}`, { method: "GET" });
  books = response.data;
  renderBooks(books);
  renderRecent(books);
}

function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

function showAuth() {
  appSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
    const body = authMode === "register" ? { name, email, password } : { email, password };

    const response = await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });

    setToken(response.data.token);
    showApp();
    await fetchBooks();
    showToast(response.message);
  } catch (error) {
    showToast(error.message);
  }
});

loginTab.addEventListener("click", () => switchAuthMode("login"));
registerTab.addEventListener("click", () => switchAuthMode("register"));

let searchTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchBooks(searchInput.value).catch((error) => showToast(error.message));
  }, 250);
});

addBookBtn.addEventListener("click", () => openModal(null));
cancelModalBtn.addEventListener("click", closeModal);
logoutBtn.addEventListener("click", () => {
  clearToken();
  showAuth();
  showToast("Logged out");
});

booksGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".book-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  const book = books.find((item) => item.id === id);
  if (book) openModal(book);
});

document.getElementById("bookImage").addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  imagePreview.src = await fileToDataUrl(file);
  imagePreview.classList.remove("hidden");
});

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const description = document.getElementById("bookDescription").value.trim();
  const imageInput = document.getElementById("bookImage");
  const file = imageInput.files?.[0];

  try {
    let imageData = null;
    if (file) {
      imageData = await fileToDataUrl(file);
    }

    const payload = {
      title,
      author,
      description,
      image_url: activeBook?.image_url || null
    };
    if (imageData) payload.image_data = imageData;

    if (activeBook) {
      await apiRequest(`/books/${activeBook.id}`, {
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
    await fetchBooks(searchInput.value);
  } catch (error) {
    showToast(error.message);
  }
});

deleteBookBtn.addEventListener("click", async () => {
  if (!activeBook) return;

  const confirmed = window.confirm(`Delete "${activeBook.title}"?`);
  if (!confirmed) return;

  try {
    await apiRequest(`/books/${activeBook.id}`, { method: "DELETE" });
    closeModal();
    await fetchBooks(searchInput.value);
    showToast("Book deleted");
  } catch (error) {
    showToast(error.message);
  }
});

async function bootstrap() {
  if (!getToken()) {
    showAuth();
    switchAuthMode("login");
    return;
  }

  try {
    showApp();
    await fetchBooks();
  } catch (error) {
    clearToken();
    showAuth();
  }
}

bootstrap();
