const BookCategory = require("./models/categeory");

exports.getImages = async (req, res) => {
  try {
    const { categeory, subcategeory, folderType } = req.query;

    console.log("[getImages] Request received", {
      categeory: categeory || "",
      subcategeory: subcategeory || "",
      folderType: folderType || "",
    });

    const filter = {};

    if (categeory && categeory.trim()) {
      filter.categeory = categeory.trim();
    }

    if (subcategeory && subcategeory.trim()) {
      filter.subcategeory = subcategeory.trim();
    }

    if (folderType && folderType.trim()) {
      filter.folderType = folderType.trim();
    }

    const images = await BookCategory.find(filter)
      .select("categeory subcategeory image folderType -_id")
      .sort({ createdAt: -1 });

    const result = images.map((item) => ({
      categeory: item.categeory || "",
      subcategeory: item.subcategeory || "",
      image: item.image || "",
      folderType: item.folderType || "",
      name:
        item.folderType === "subcategory"
          ? item.subcategeory || ""
          : item.categeory || "",
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("[getImages] Error fetching images:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch images",
    });
  }
};
