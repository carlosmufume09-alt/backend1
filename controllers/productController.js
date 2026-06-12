const Product = require('../models/Product');
const Order = require('../models/Order');
const cloudinaryService = require('../services/cloudinaryService');

const uploadFileToCloudinary = async (file) => {
  const result = await cloudinaryService.uploadFromBuffer(
    file.buffer,
    file.originalname
  );
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes
  };
};

// ========== GET ALL PRODUCTS ==========
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: products,
      message: 'Produtos recuperados com sucesso'
    });
  } catch (error) {
    console.error('[v0] Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos',
      error: error.message
    });
  }
};

// ========== GET PRODUCT BY ID ==========
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    res.status(200).json({
      success: true,
      data: product,
      message: 'Produto recuperado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produto',
      error: error.message
    });
  }
};

// ========== UPLOAD IMAGE (Cloudinary → URL no MongoDB) ==========
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem fornecida'
      });
    }

    const uploaded = await uploadFileToCloudinary(req.file);

    res.status(200).json({
      success: true,
      filePath: uploaded.url,
      url: uploaded.url,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      optimizedUrl: cloudinaryService.getOptimizedUrl(uploaded.publicId),
      message: 'Imagem enviada com sucesso'
    });
  } catch (error) {
    console.error('[v0] Erro no upload Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload da imagem',
      error: error.message
    });
  }
};

// ========== CREATE PRODUCT WITH JSON (sem arquivo) ==========
exports.createProductJSON = async (req, res) => {
  try {
    const { name, description, price, category, stock, image, rating, sales } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nome, preço e categoria são obrigatórios'
      });
    }
    const product = await Product.create({
      name,
      description: description || '',
      price: parseInt(price),
      image: image || '',
      category,
      stock: stock || 0,
      rating: rating || 4.5,
      sales: sales || 0
    });
    res.status(201).json({
      success: true,
      data: product,
      message: 'Produto criado com sucesso'
    });
  } catch (error) {
    console.error('[v0] Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto',
      error: error.message
    });
  }
};

// ========== CREATE PRODUCT WITH FILE UPLOAD ==========
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    let image = req.body.image || '';

    if (req.file) {
      const uploaded = await uploadFileToCloudinary(req.file);
      image = uploaded.url;
    }

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nome, preço e categoria são obrigatórios'
      });
    }

    const product = await Product.create({
      name,
      description: description || '',
      price: parseInt(price),
      image,
      category,
      stock: stock || 0
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Produto criado com sucesso'
    });
  } catch (error) {
    console.error('[v0] Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto',
      error: error.message
    });
  }
};

// ========== UPDATE PRODUCT ==========
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nome, preço e categoria são obrigatórios'
      });
    }

    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    let image = req.body.image || existing.image;

    if (req.file) {
      const uploaded = await uploadFileToCloudinary(req.file);
      if (existing.image && existing.image !== uploaded.url) {
        await cloudinaryService.deleteByUrl(existing.image).catch(() => {});
      }
      image = uploaded.url;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description: description || '',
        price: parseInt(price),
        image,
        category,
        stock: stock || 0
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: product,
      message: 'Produto atualizado com sucesso'
    });
  } catch (error) {
    console.error('[v0] Erro ao atualizar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar produto',
      error: error.message
    });
  }
};

// ========== DELETE PRODUCT ==========
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    if (product.image) {
      await cloudinaryService.deleteByUrl(product.image).catch((err) => {
        console.error('Erro ao deletar imagem no Cloudinary:', err.message);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Produto deletado com sucesso' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar produto',
      error: error.message
    });
  }
};

// ========== SEARCH PRODUCTS ==========
exports.searchProducts = async (req, res) => {
  try {
    const { term, category } = req.query;
    const filter = {};
    if (term) {
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ];
    }
    if (category && category !== 'Todos') {
      filter.category = category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: products,
      message: 'Produtos encontrados'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao pesquisar produtos',
      error: error.message
    });
  }
};

// ========== GET PRODUCTS BY CATEGORY ==========
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    if (category === 'Todos') {
      return exports.getAllProducts(req, res);
    }
    const products = await Product.find({ category }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: products,
      message: 'Produtos recuperados com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos por categoria',
      error: error.message
    });
  }
};

// ========== GET RANDOM PRODUCTS ==========
exports.getRandomProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const products = await Product.aggregate([{ $sample: { size: limit } }]);
    res.status(200).json({
      success: true,
      data: products,
      message: 'Produtos aleatórios recuperados com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos aleatórios',
      error: error.message
    });
  }
};

// ========== GET ADMIN DASHBOARD STATS ==========
exports.getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Product.distinct('category').then(cats => cats.length);
    const totalOrders = await Order.countDocuments();
    const totalRevenueResult = await Order.aggregate([
      { $match: { status: { $ne: 'cancelado' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    const stats = {
      totalProducts,
      totalCategories,
      totalOrders,
      totalRevenue
    };
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Estatísticas recuperadas com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
};

// ========== ADMIN LOGIN ==========
exports.adminLogin = (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USERNAME = 'shopall';
  const ADMIN_PASSWORD = '123456';
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.status(200).json({
      success: true,
      message: 'Autenticação bem-sucedida',
      token: 'admin-' + Date.now()
    });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
};

// ========== GET ALL ORDERS ==========
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orders,
      message: 'Pedidos recuperados com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos',
      error: error.message
    });
  }
};