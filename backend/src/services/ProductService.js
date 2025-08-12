const { Product, Category, Inventory, Review } = require('../models');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');
const { Op } = require('sequelize');

class ProductService {
    /**
     * Obtiene un producto por ID
     * @param {number} productId - ID del producto
     * @param {Object} options - Opciones adicionales
     * @returns {Object} Producto encontrado
     */
    static async getProductById(productId, options = {}) {
        try {
            const {
                includeCategory = true,
                includeInventory = true,
                includeReviews = false
            } = options;

            const includeClause = [];
            
            if (includeCategory) {
                includeClause.push({
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug']
                });
            }

            if (includeInventory) {
                includeClause.push({
                    model: Inventory,
                    as: 'inventory',
                    attributes: ['quantity', 'min_stock', 'max_stock']
                });
            }

            if (includeReviews) {
                includeClause.push({
                    model: Review,
                    as: 'reviews',
                    attributes: ['rating', 'comment', 'created_at'],
                    separate: true,
                    limit: 5,
                    order: [['created_at', 'DESC']]
                });
            }

            const product = await Product.findByPk(productId, {
                include: includeClause
            });

            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            return product;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener producto: ' + error.message);
        }
    }

    /**
     * Obtiene un producto por SKU
     * @param {string} sku - SKU del producto
     * @returns {Object} Producto encontrado
     */
    static async getProductBySku(sku) {
        try {
            const product = await Product.findOne({
                where: { sku: sku.toUpperCase() },
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    },
                    {
                        model: Inventory,
                        as: 'inventory',
                        attributes: ['quantity', 'min_stock', 'max_stock']
                    }
                ]
            });

            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            return product;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener producto: ' + error.message);
        }
    }

    /**
     * Lista productos con paginacion y filtros
     * @param {Object} options - Opciones de paginacion y filtros
     * @returns {Object} Lista de productos y metadata
     */
    static async listProducts(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                categoryId = null,
                minPrice = null,
                maxPrice = null,
                is_active = true,
                sortBy = 'created_at',
                sortOrder = 'DESC',
                includeCategory = true,
                includeInventory = true
            } = options;

            const offset = (page - 1) * limit;
            const whereClause = {};

            // Filtros basicos
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } },
                    { sku: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (categoryId) {
                whereClause.category_id = categoryId;
            }

            if (minPrice !== null || maxPrice !== null) {
                whereClause.price = {};
                if (minPrice !== null) whereClause.price[Op.gte] = minPrice;
                if (maxPrice !== null) whereClause.price[Op.lte] = maxPrice;
            }

            if (is_active !== null) {
                whereClause.is_active = is_active;
            }

            const includeClause = [];
            
            if (includeCategory) {
                includeClause.push({
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug']
                });
            }

            if (includeInventory) {
                includeClause.push({
                    model: Inventory,
                    as: 'inventory',
                    attributes: ['quantity', 'min_stock', 'max_stock']
                });
            }

            const { count, rows } = await Product.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                products: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw new Error('Error al listar productos: ' + error.message);
        }
    }

    /**
     * Crea un nuevo producto
     * @param {Object} productData - Datos del producto
     * @returns {Object} Producto creado
     */
    static async createProduct(productData) {
        try {
            // Verificar si el SKU ya existe
            if (productData.sku) {
                const existingProduct = await Product.findOne({
                    where: { sku: productData.sku.toUpperCase() }
                });

                if (existingProduct) {
                    throw new ConflictError('Ya existe un producto con ese SKU');
                }
            }

            // Verificar si la categoria existe
            if (productData.category_id) {
                const category = await Category.findByPk(productData.category_id);
                if (!category) {
                    throw new ValidationError('Categoria no encontrada');
                }
            }

            const product = await Product.create(productData);

            // Crear registro de inventario por defecto
            await Inventory.create({
                product_id: product.id,
                quantity: 0,
                min_stock: 5,
                max_stock: 100
            });

            return await this.getProductById(product.id);
        } catch (error) {
            if (error instanceof ConflictError || error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Error al crear producto: ' + error.message);
        }
    }

    /**
     * Actualiza un producto
     * @param {number} productId - ID del producto
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Producto actualizado
     */
    static async updateProduct(productId, updateData) {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            // Verificar si el nuevo SKU ya existe
            if (updateData.sku) {
                const existingProduct = await Product.findOne({
                    where: {
                        sku: updateData.sku.toUpperCase(),
                        id: { [Op.ne]: productId }
                    }
                });

                if (existingProduct) {
                    throw new ConflictError('Ya existe un producto con ese SKU');
                }
            }

            // Verificar si la categoria existe
            if (updateData.category_id) {
                const category = await Category.findByPk(updateData.category_id);
                if (!category) {
                    throw new ValidationError('Categoria no encontrada');
                }
            }

            await product.update(updateData);
            return await this.getProductById(productId);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Error al actualizar producto: ' + error.message);
        }
    }

    /**
     * Activa o desactiva un producto
     * @param {number} productId - ID del producto
     * @param {boolean} isActive - Estado activo
     * @returns {Object} Producto actualizado
     */
    static async toggleProductStatus(productId, isActive) {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            await product.update({ is_active: isActive });
            return await this.getProductById(productId);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al cambiar estado de producto: ' + error.message);
        }
    }

    /**
     * Elimina un producto
     * @param {number} productId - ID del producto
     * @returns {boolean} True si se elimino exitosamente
     */
    static async deleteProduct(productId) {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            // Verificar si tiene pedidos asociados
            const orderItemCount = await require('../models').OrderItem.count({
                where: { product_id: productId }
            });

            if (orderItemCount > 0) {
                throw new BusinessLogicError(`No se puede eliminar el producto. Tiene ${orderItemCount} pedidos asociados.`);
            }

            await product.destroy();
            return true;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al eliminar producto: ' + error.message);
        }
    }

    /**
     * Busca productos por termino de busqueda
     * @param {string} searchTerm - Termino de busqueda
     * @param {Object} options - Opciones de busqueda
     * @returns {Array} Lista de productos encontrados
     */
    static async searchProducts(searchTerm, options = {}) {
        try {
            const {
                limit = 10,
                categoryId = null,
                minPrice = null,
                maxPrice = null,
                sortBy = 'name',
                sortOrder = 'ASC'
            } = options;

            const whereClause = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${searchTerm}%` } },
                    { description: { [Op.iLike]: `%${searchTerm}%` } },
                    { sku: { [Op.iLike]: `%${searchTerm}%` } }
                ],
                is_active: true
            };

            if (categoryId) {
                whereClause.category_id = categoryId;
            }

            if (minPrice !== null || maxPrice !== null) {
                whereClause.price = {};
                if (minPrice !== null) whereClause.price[Op.gte] = minPrice;
                if (maxPrice !== null) whereClause.price[Op.lte] = maxPrice;
            }

            const products = await Product.findAll({
                where: whereClause,
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    },
                    {
                        model: Inventory,
                        as: 'inventory',
                        attributes: ['quantity', 'min_stock', 'max_stock']
                    }
                ],
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit)
            });

            return products;
        } catch (error) {
            throw new Error('Error al buscar productos: ' + error.message);
        }
    }

    /**
     * Obtiene productos destacados
     * @param {Object} options - Opciones de consulta
     * @returns {Array} Lista de productos destacados
     */
    static async getFeaturedProducts(options = {}) {
        try {
            const {
                limit = 8,
                categoryId = null
            } = options;

            const whereClause = {
                is_active: true
            };

            if (categoryId) {
                whereClause.category_id = categoryId;
            }

            const products = await Product.findAll({
                where: whereClause,
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    },
                    {
                        model: Inventory,
                        as: 'inventory',
                        attributes: ['quantity', 'min_stock', 'max_stock']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit)
            });

            return products;
        } catch (error) {
            throw new Error('Error al obtener productos destacados: ' + error.message);
        }
    }

    /**
     * Obtiene productos con stock bajo
     * @param {Object} options - Opciones de consulta
     * @returns {Array} Lista de productos con stock bajo
     */
    static async getLowStockProducts(options = {}) {
        try {
            const {
                limit = 10,
                threshold = null
            } = options;

            const products = await Product.findAll({
                where: { is_active: true },
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    },
                    {
                        model: Inventory,
                        as: 'inventory',
                        where: threshold ? { quantity: { [Op.lte]: threshold } } : {},
                        attributes: ['quantity', 'min_stock', 'max_stock']
                    }
                ],
                order: [['inventory', 'quantity', 'ASC']],
                limit: parseInt(limit)
            });

            return products;
        } catch (error) {
            throw new Error('Error al obtener productos con stock bajo: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de productos
     * @returns {Object} Estadisticas de productos
     */
    static async getProductStats() {
        try {
            const totalProducts = await Product.count();
            const activeProducts = await Product.count({ where: { is_active: true } });
            const inactiveProducts = await Product.count({ where: { is_active: false } });

            // Productos por categoria
            const productsByCategory = await Category.findAll({
                attributes: {
                    include: [
                        [require('sequelize').fn('COUNT', require('sequelize').col('Products.id')), 'product_count']
                    ]
                },
                include: [{
                    model: Product,
                    attributes: []
                }],
                group: ['Category.id'],
                order: [[require('sequelize').fn('COUNT', require('sequelize').col('Products.id')), 'DESC']]
            });

            // Productos con stock bajo
            const lowStockProducts = await Product.count({
                include: [{
                    model: Inventory,
                    as: 'inventory',
                    where: {
                        quantity: { [Op.lte]: require('sequelize').col('inventory.min_stock') }
                    }
                }]
            });

            // Productos sin stock
            const outOfStockProducts = await Product.count({
                include: [{
                    model: Inventory,
                    as: 'inventory',
                    where: { quantity: 0 }
                }]
            });

            return {
                total: totalProducts,
                active: activeProducts,
                inactive: inactiveProducts,
                productsByCategory: productsByCategory,
                lowStock: lowStockProducts,
                outOfStock: outOfStockProducts
            };
        } catch (error) {
            throw new Error('Error al obtener estadisticas de productos: ' + error.message);
        }
    }

    /**
     * Obtiene productos relacionados
     * @param {number} productId - ID del producto
     * @param {Object} options - Opciones de consulta
     * @returns {Array} Lista de productos relacionados
     */
    static async getRelatedProducts(productId, options = {}) {
        try {
            const {
                limit = 4
            } = options;

            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            const relatedProducts = await Product.findAll({
                where: {
                    category_id: product.category_id,
                    id: { [Op.ne]: productId },
                    is_active: true
                },
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'slug']
                    },
                    {
                        model: Inventory,
                        as: 'inventory',
                        attributes: ['quantity', 'min_stock', 'max_stock']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit)
            });

            return relatedProducts;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener productos relacionados: ' + error.message);
        }
    }
}

module.exports = ProductService;
