const express = require("express");
const {
  listBooks,
  addBook,
  editBook,
  removeBook
} = require("../controllers/bookController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);
router.get("/", listBooks);
router.post("/", addBook);
router.put("/:id", editBook);
router.delete("/:id", removeBook);

module.exports = router;
