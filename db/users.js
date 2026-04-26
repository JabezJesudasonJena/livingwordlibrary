const pool = require("./pool");

async function createUser({ name, email, password }) {
  const query = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING id, name, email
  `;
  const result = await pool.query(query, [name || null, email, password]);
  return result.rows[0];
}

async function getUserByEmail(email) {
  const query = "SELECT * FROM users WHERE email = $1 LIMIT 1";
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  getUserByEmail
};
