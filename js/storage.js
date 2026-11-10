import { initialBooks } from "./books.js";

const BOOKS_KEY = "booknest_books_v1";
const RESERVATIONS_KEY = "booknest_reservations_v1";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key}; using default data.`, error);
    return fallback;
  }
}

export function loadBooks() {
  const saved = readJSON(BOOKS_KEY, null);
  if (!Array.isArray(saved) || saved.length === 0) {
    const fresh = structuredClone(initialBooks);
    saveBooks(fresh);
    return fresh;
  }
  return saved;
}

export function saveBooks(books) {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function loadReservations() {
  const saved = readJSON(RESERVATIONS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

export function saveReservations(reservations) {
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
}
