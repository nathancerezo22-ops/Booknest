import { loadBooks, saveBooks, loadReservations, saveReservations } from "./storage.js";
import { validateStudent, createReservation } from "./reservations.js";

let books = loadBooks();
let reservations = loadReservations();
let selectedBookId = null;
let activeView = "discover";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const els = {
  bookGrid: $("#bookGrid"), emptyBooks: $("#emptyBooks"), search: $("#searchInput"),
  category: $("#categoryFilter"), availability: $("#availabilityFilter"),
  results: $("#resultsLabel"), modal: $("#modalBackdrop"), modalContent: $("#modalContent"),
  toast: $("#toastRegion"), reservationList: $("#reservationList"),
  emptyReservations: $("#emptyReservations")
};

function persist() {
  saveBooks(books);
  saveReservations(reservations);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  els.toast.append(toast);
  window.setTimeout(() => toast.remove(), 3300);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", { month:"short", day:"numeric", year:"numeric" }).format(new Date(dateString));
}

function updateStats() {
  $("#totalBooks").textContent = books.length;
  $("#availableBooks").textContent = books.filter(book => book.available).length;
  $("#activeReservations").textContent = reservations.length;
  $("#navReservationCount").textContent = reservations.length;
  $("#reservationTotal").textContent = reservations.length;
}

function populateCategories() {
  const categories = [...new Set(books.map(book => book.category))].sort();
  els.category.innerHTML = '<option value="all">All categories</option>' +
    categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("");
}

function bookCard(book) {
  const status = book.available ? "Available" : "Reserved";
  return `
    <article class="book-card">
      <div class="cover-wrap">
        <div class="cover-art cover-${book.cover}">
          <small>BOOKNEST LIBRARY</small><strong>${escapeHTML(book.title.split(" ").slice(0,3).join("<br>"))}</strong><i></i>
        </div>
        <span class="status-pill ${book.available ? "" : "reserved"}">${status}</span>
      </div>
      <div class="card-body">
        <div class="book-category">${escapeHTML(book.category)}</div>
        <h3>${escapeHTML(book.title)}</h3>
        <div class="book-author">by ${escapeHTML(book.author)}</div>
        <div class="card-bottom"><span>${book.year} · ${escapeHTML(book.id)}</span>
          <button class="card-action" data-action="details" data-id="${escapeHTML(book.id)}">View details ↗</button>
        </div>
      </div>
    </article>`;
}

function getFilteredBooks() {
  const query = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const availability = els.availability.value;
  return books.filter(book => {
    const matchesText = !query || [book.title, book.author, book.category, book.description].some(value => value.toLowerCase().includes(query));
    const matchesCategory = category === "all" || book.category === category;
    const matchesAvailability = availability === "all" || (availability === "available" ? book.available : !book.available);
    return matchesText && matchesCategory && matchesAvailability;
  });
}

function renderBooks() {
  const filtered = getFilteredBooks();
  els.bookGrid.innerHTML = filtered.map(bookCard).join("");
  els.bookGrid.classList.toggle("hidden", filtered.length === 0);
  els.emptyBooks.classList.toggle("hidden", filtered.length !== 0);
  els.results.textContent = `Showing ${filtered.length} of ${books.length} books`;
  updateStats();
}

function showBookDetails(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book) return;
  selectedBookId = bookId;
  const statusText = book.available ? "Available to reserve" : "Currently reserved";
  els.modalContent.innerHTML = `
    <div class="modal-book-head">
      <div class="modal-cover cover-${book.cover}">${escapeHTML(book.title.split(" ").slice(0,3).join(" "))}</div>
      <div>
        <div class="modal-category">${escapeHTML(book.category)} · ${escapeHTML(book.id)}</div>
        <h2 id="modalTitle">${escapeHTML(book.title)}</h2>
        <div class="modal-author">by ${escapeHTML(book.author)}</div>
        <p class="modal-description">${escapeHTML(book.description)}</p>
        <span class="status-pill ${book.available ? "" : "reserved"}">${statusText}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><small>Publication year</small><strong>${book.year}</strong></div>
      <div class="detail-item"><small>Publisher</small><strong>${escapeHTML(book.publisher)}</strong></div>
      <div class="detail-item"><small>ISBN</small><strong>${escapeHTML(book.isbn)}</strong></div>
      <div class="detail-item"><small>Book reference</small><strong>${escapeHTML(book.id)}</strong></div>
    </div>
    ${book.available ? `
      <h3 class="modal-section-title">Reserve this title</h3>
      <form id="reservationForm" novalidate>
        <div class="form-grid">
          <div class="form-field"><label for="studentName">Full name *</label><input id="studentName" name="studentName" maxlength="80" placeholder="e.g. Alex Santos" required></div>
          <div class="form-field"><label for="studentId">Student ID *</label><input id="studentId" name="studentId" maxlength="30" placeholder="e.g. 2026-0001" required></div>
          <div class="form-field full"><label for="studentEmail">Email address *</label><input id="studentEmail" name="studentEmail" type="email" maxlength="100" placeholder="name@school.edu" required></div>
        </div>
        <div class="form-error" id="formError" role="alert"></div>
        <button class="modal-submit" type="submit">Confirm reservation <span>↗</span></button>
      </form>` : `<div class="modal-unavailable">This title is already reserved in this prototype. Please check back later or browse other available books.</div>`}`;
  els.modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("#closeModal").focus();
}

function closeModal() {
  els.modal.classList.add("hidden");
  document.body.style.overflow = "";
  selectedBookId = null;
}

function handleReservation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const student = {
    name: $("#studentName").value,
    studentId: $("#studentId").value,
    email: $("#studentEmail").value
  };
  const validationError = validateStudent(student);
  const errorNode = $("#formError");
  if (validationError) {
    errorNode.textContent = validationError;
    return;
  }
  const book = books.find(item => item.id === selectedBookId);
  const result = createReservation(book, student, reservations);
  if (result.error) {
    errorNode.textContent = result.error;
    return;
  }
  reservations.push(result.reservation);
  book.available = false;
  persist();
  closeModal();
  renderBooks();
  renderReservations();
  showToast(`"${book.title}" has been reserved successfully.`);
}

function renderReservations() {
  updateStats();
  els.reservationList.innerHTML = reservations.map(reservation => {
    const book = books.find(item => item.id === reservation.bookId);
    if (!book) return "";
    return `
      <article class="reservation-card">
        <div class="mini-cover cover-${book.cover}">${escapeHTML(book.title.split(" ").slice(0,2).join(" "))}</div>
        <div class="reservation-info">
          <h3>${escapeHTML(book.title)}</h3>
          <p>by ${escapeHTML(book.author)}</p>
          <div class="reservation-meta">Reserved ${formatDate(reservation.reservedAt)} · Student ID: ${escapeHTML(reservation.studentId)}</div>
        </div>
        <div class="reservation-actions"><span class="reservation-state">● ${escapeHTML(reservation.status)}</span>
          <button class="cancel-button" data-action="cancel" data-id="${escapeHTML(reservation.id)}">Cancel</button>
        </div>
      </article>`;
  }).join("");
  const hasReservations = reservations.length > 0;
  els.reservationList.classList.toggle("hidden", !hasReservations);
  els.emptyReservations.classList.toggle("hidden", hasReservations);
}

function cancelReservation(reservationId) {
  const reservation = reservations.find(item => item.id === reservationId);
  if (!reservation) return;
  const book = books.find(item => item.id === reservation.bookId);
  if (!window.confirm(`Cancel your reservation for "${book?.title ?? "this book"}"?`)) return;
  reservations = reservations.filter(item => item.id !== reservationId);
  if (book) book.available = true;
  persist();
  renderBooks();
  renderReservations();
  showToast("Reservation cancelled. The book is available again.");
}

function switchView(viewName) {
  activeView = viewName;
  $("#discoverView").classList.toggle("active", viewName === "discover");
  $("#reservationsView").classList.toggle("active", viewName === "reservations");
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === viewName));
  $("#breadcrumbCurrent").textContent = viewName === "discover" ? "Discover" : "My reservations";
  if (viewName === "reservations") renderReservations();
  window.scrollTo({ top:0, behavior:"smooth" });
}

function resetFilters() {
  els.search.value = "";
  els.category.value = "all";
  els.availability.value = "all";
  renderBooks();
}

function initialize() {
  populateCategories();
  renderBooks();
  renderReservations();
  $("#todayLabel").textContent = new Intl.DateTimeFormat("en", { weekday:"short", month:"short", day:"numeric" }).format(new Date());

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-view]");
    if (nav) switchView(nav.dataset.view);

    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "details") showBookDetails(action.dataset.id);
    if (action?.dataset.action === "cancel") cancelReservation(action.dataset.id);
  });

  els.search.addEventListener("input", renderBooks);
  els.category.addEventListener("change", renderBooks);
  els.availability.addEventListener("change", renderBooks);
  $("#resetFilters").addEventListener("click", resetFilters);
  $("#emptyReset").addEventListener("click", resetFilters);
  $("#exploreButton").addEventListener("click", () => $("#collection").scrollIntoView({ behavior:"smooth" }));
  $("#browseFromEmpty").addEventListener("click", () => switchView("discover"));
  $("#closeModal").addEventListener("click", closeModal);
  els.modal.addEventListener("click", event => { if (event.target === els.modal) closeModal(); });
  els.modalContent.addEventListener("submit", event => {
    if (event.target.id === "reservationForm") handleReservation(event);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !els.modal.classList.contains("hidden")) closeModal();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      switchView("discover");
      els.search.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", initialize);
