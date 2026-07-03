const Sellbooks = require("../models/sellbooks");
const mongoose = require("mongoose");

const buildImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  return url;
};

const getFinalPrice = (book) => {
  if (
    book.updatedPrice !== undefined &&
    book.updatedPrice !== null &&
    book.updatedPrice !== ""
  ) {
    return Number(book.updatedPrice);
  }
  return Number(book.price || 0);
};

const formatBook = (book) => ({
  _id: book._id,
  name: book.name || "",
  image: buildImageUrl(book.image),
  originalImage: book.image || "",
  price: Number(book.price || 0),
  updatedPrice: getFinalPrice(book),
  condition: book.condition || "",
  description: book.description || "",
  state: book.state || "",
  district: book.district || "",
  pincode: book.pincode || "",
  address: book.address || "",
  landmark: book.landmark || "",
  categeory: book.categeory || "",
  subcategeory: book.subcategeory || "",
  selltype: book.selltype || "",
  status: book.status || "",
  soldstatus: book.soldstatus || "",
  createdAt: book.createdAt || book.date_added || null,
  seller: {
    fullname: book.user?.fullname || "",
    email: book.user?.email || "",
    mobileNumber: book.user?.mobileNumber || "",
  },
});

const getSortObject = (sortBy) => {
  switch (sortBy) {
    case "priceLowToHigh":
      return { updatedPrice: 1, price: 1, createdAt: -1 };
    case "priceHighToLow":
      return { updatedPrice: -1, price: -1, createdAt: -1 };
    case "oldest":
      return { createdAt: 1, date_added: 1 };
    case "latest":
    default:
      return { createdAt: -1, date_added: -1 };
  }
};

const buildBaseFilter = () => ({
  status: "Accepted",
  soldstatus: { $ne: "Soldout" },
});

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("[buyBooksController:getBookById] Request received", {
      bookId: id || "",
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn("[buyBooksController:getBookById] Invalid book ID", {
        bookId: id,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book = await Sellbooks.findOne({
      _id: id,
      status: "Accepted",
      soldstatus: { $ne: "Soldout" },
    }).populate("user", "fullname email mobileNumber");

    if (!book) {
      console.warn("[buyBooksController:getBookById] Book not found", {
        bookId: id,
      });
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    console.log("[buyBooksController:getBookById] Book fetched", {
      bookId: id,
    });

    return res.status(200).json({
      success: true,
      book: formatBook(book),
    });
  } catch (error) {
    console.error("getBookById error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const { sortBy } = req.query;

    console.log("[buyBooksController:getAllBooks] Request received", {
      sortBy: sortBy || "latest",
    });

    const books = await Sellbooks.find(buildBaseFilter())
      .populate("user", "fullname email mobileNumber")
      .sort(getSortObject(sortBy));

    console.log("[buyBooksController:getAllBooks] Books fetched", {
      totalBooks: books.length,
      sortBy: sortBy || "latest",
    });

    return res.status(200).json({
      success: true,
      total: books.length,
      books: books.map(formatBook),
    });
  } catch (error) {
    console.error("getAllBooks error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getBooksByFilter = async (req, res) => {
  try {
    const {
      categeory,
      subcategeory,
      district,
      condition,
      selltype,
      minPrice,
      maxPrice,
      sortBy,
      search,
    } = req.query;

    console.log("[buyBooksController:getBooksByFilter] Request received", {
      categeory: categeory || "",
      subcategeory: subcategeory || "",
      district: district || "",
      condition: condition || "",
      selltype: selltype || "",
      minPrice: minPrice || "",
      maxPrice: maxPrice || "",
      sortBy: sortBy || "latest",
      search: search || "",
    });

    const filter = buildBaseFilter();

    if (categeory && categeory.trim()) {
      filter.categeory = categeory.trim();
    }

    if (subcategeory && subcategeory.trim()) {
      filter.subcategeory = subcategeory.trim();
    }

    if (district && district.trim()) {
      filter.district = { $regex: district.trim(), $options: "i" };
    }

    if (condition && condition.trim()) {
      filter.condition = condition.trim();
    }

    if (selltype && selltype.trim()) {
      filter.selltype = selltype.trim();
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { categeory: { $regex: keyword, $options: "i" } },
        { subcategeory: { $regex: keyword, $options: "i" } },
        { district: { $regex: keyword, $options: "i" } },
      ];
    }

    const books = await Sellbooks.find(filter)
      .populate("user", "fullname email mobileNumber")
      .sort(getSortObject(sortBy));

    let formattedBooks = books.map(formatBook);

    if (minPrice !== undefined || maxPrice !== undefined) {
      const min =
        minPrice !== undefined && minPrice !== "" ? Number(minPrice) : 0;
      const max =
        maxPrice !== undefined && maxPrice !== ""
          ? Number(maxPrice)
          : Number.MAX_SAFE_INTEGER;

      if (Number.isNaN(min) || Number.isNaN(max)) {
        console.warn(
          "[buyBooksController:getBooksByFilter] Invalid price range",
          {
            minPrice,
            maxPrice,
          },
        );
        return res.status(400).json({
          success: false,
          message: "minPrice and maxPrice must be valid numbers",
        });
      }

      formattedBooks = formattedBooks.filter(
        (book) => book.updatedPrice >= min && book.updatedPrice <= max,
      );
    }

    console.log("[buyBooksController:getBooksByFilter] Books fetched", {
      totalBooks: formattedBooks.length,
    });

    return res.status(200).json({
      success: true,
      total: formattedBooks.length,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("getBooksByFilter error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getBookById,
  getAllBooks,
  getBooksByFilter,
};
