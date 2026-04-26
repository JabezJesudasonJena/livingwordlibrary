const { v2: cloudinary } = require("cloudinary");
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
} = require("../db/books");

async function uploadImageIfNeeded(imageData) {
  if (!imageData) return null;

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary is not configured");
  }

  const uploadResult = await cloudinary.uploader.upload(imageData, {
    folder: "library-books"
  });
  return uploadResult.secure_url;
}

async function listBooks(req, res) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const books = await getBooks(search);

    return res.json({
      success: true,
      data: books,
      message: "Books fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to fetch books"
    });
  }
}

async function addBook(req, res) {
  try {
    const { title, author, description, image_data } = req.body;

    if (!title || !author) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Title and author are required"
      });
    }

    const imageUrl = await uploadImageIfNeeded(image_data);
    const newBook = await createBook({
      title: title.trim(),
      author: author.trim(),
      description: description ? description.trim() : null,
      image_url: imageUrl
    });

    return res.status(201).json({
      success: true,
      data: newBook,
      message: "Book added successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message === "Cloudinary is not configured"
        ? "Image upload is unavailable: Cloudinary is not configured"
        : "Failed to add book"
    });
  }
}

async function editBook(req, res) {
  try {
    const bookId = Number(req.params.id);
    const { title, author, description, image_data, image_url } = req.body;

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid book id"
      });
    }

    if (!title || !author) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Title and author are required"
      });
    }

    const existingBook = await getBookById(bookId);
    if (!existingBook) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Book not found"
      });
    }

    // If a new image is uploaded, replace image URL; otherwise keep current value.
    let finalImageUrl = typeof image_url === "string" ? image_url : existingBook.image_url;
    if (image_data) {
      finalImageUrl = await uploadImageIfNeeded(image_data);
    }

    const updatedBook = await updateBook(bookId, {
      title: title.trim(),
      author: author.trim(),
      description: description ? description.trim() : null,
      image_url: finalImageUrl
    });

    return res.json({
      success: true,
      data: updatedBook,
      message: "Book updated successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message === "Cloudinary is not configured"
        ? "Image upload is unavailable: Cloudinary is not configured"
        : "Failed to update book"
    });
  }
}

async function removeBook(req, res) {
  try {
    const bookId = Number(req.params.id);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid book id"
      });
    }

    const deleted = await deleteBook(bookId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Book not found"
      });
    }

    return res.json({
      success: true,
      data: deleted,
      message: "Book deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to delete book"
    });
  }
}

module.exports = {
  listBooks,
  addBook,
  editBook,
  removeBook
};
