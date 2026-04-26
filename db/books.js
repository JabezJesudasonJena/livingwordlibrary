const pool = require("./pool");

async function getBooks(search = "") {
  if (search) {
    const query = `
      SELECT id, title, author, description, image_url, created_at
      FROM books
      WHERE title ILIKE $1 OR author ILIKE $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [`%${search}%`]);
    return result.rows;
  }

  const query = `
    SELECT id, title, author, description, image_url, created_at
    FROM books
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

async function getBookById(id) {
  const query = `
    SELECT id, title, author, description, image_url, created_at
    FROM books
    WHERE id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

async function createBook({ title, author, description, image_url }) {
  const query = `
    INSERT INTO books (title, author, description, image_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, author, description, image_url, created_at
  `;
  const result = await pool.query(query, [
    title,
    author,
    description || null,
    image_url || null
  ]);
  return result.rows[0];
}

async function updateBook(id, { title, author, description, image_url }) {
  const query = `
    UPDATE books
    SET title = $1, author = $2, description = $3, image_url = $4
    WHERE id = $5
    RETURNING id, title, author, description, image_url, created_at
  `;
  const result = await pool.query(query, [
    title,
    author,
    description || null,
    image_url || null,
    id
  ]);
  return result.rows[0] || null;
}

async function deleteBook(id) {
  const query = "DELETE FROM books WHERE id = $1 RETURNING id";
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
