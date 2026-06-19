const Category = require("../model/Category");

// create category
exports.createCategory = async (req, res) => {
  try {
    const {name} = req.body;

    // cek apakah kategori sudah ada
    const exists = await Category.findOne({name});
    if (exists) return res.status(400).json({message: "Kategori sudah ada"});

    const category = await Category.create({name});

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({createdAt: -1});

    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get category by id
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(404).json({message: "Kategori tidak ditemukan"});

    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// update category
exports.updateCategory = async (req, res) => {
  try {
    const {id} = req.params;
    const {name} = req.body;

    const updated = await Category.findByIdAndUpdate(id, {name}, {new: true});

    if (!updated)
      return res.status(404).json({message: "Kategori tidak ditemukan"});

    res.json({
      message: "Category updated successfully",
      updated,
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// delete category
exports.deleteCategory = async (req, res) => {
  try {
    const {id} = req.params;

    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({message: "Kategori tidak ditemukan"});

    res.json({message: "Delete category successfully"});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};
