export function validateStudent({ name, studentId, email }) {
  if (!name.trim() || !studentId.trim() || !email.trim()) {
    return "Please complete all required fields.";
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) return "Enter a valid email address.";
  if (studentId.trim().length < 4) return "Student ID must contain at least 4 characters.";
  return "";
}

export function createReservation(book, student, reservations) {
  if (!book) return { error: "This book could not be found." };
  if (!book.available) return { error: "This book is currently reserved and cannot be requested." };
  const duplicate = reservations.some(item =>
    item.bookId === book.id && item.studentId.toLowerCase() === student.studentId.trim().toLowerCase()
  );
  if (duplicate) return { error: "You already have an active reservation for this book." };

  const reservation = {
    id: `RS-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    bookId: book.id,
    studentName: student.name.trim(),
    studentId: student.studentId.trim(),
    email: student.email.trim(),
    reservedAt: new Date().toISOString(),
    status: "Active"
  };
  return { reservation };
}
