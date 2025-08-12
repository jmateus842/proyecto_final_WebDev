const { Category, Product } = require('../models');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { Op } = require('sequelize');

class CategoryService {
    /**
     * Obtiene una categoria por ID
     * @param {number} categoryId - ID de la categoria
     * @returns {Object} Categoria encontrada
     */
    static async getCategoryById(categoryId) {
        try {
            const category = await Category.findByPk(categoryId);
            
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            return category;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener categoria: ' + error.message);
        }
    }

    /**
     * Obtiene una categoria por slug
     * @param {string} slug - Slug de la categoria
     * @returns {Object} Categoria encontrada
     */
    static async getCategoryBySlug(slug) {
        try {
            const category = await Category.findOne({
                where: { slug: slug.toLowerCase() }
            });
            
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            return category;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener categoria: ' + error.message);
        }
    }

    /**
     * Lista todas las categorias activas
     * @param {Object} options - Opciones de filtrado y ordenamiento
     * @returns {Array} Lista de categorias
     */
    static async listActiveCategories(options = {}) {
        try {
            const {
                includeInactive = false,
                sortBy = 'name',
                sortOrder = 'ASC'
            } = options;

            const whereClause = {};
            if (!includeInactive) {
                whereClause.is_active = true;
            }

            const categories = await Category.findAll({
                where: whereClause,
                order: [[sortBy, sortOrder]]
            });

            return categories;
        } catch (error) {
            throw new Error('Error al listar categorias: ' + error.message);
        }
    }

    /**
     * Lista categorias con paginacion y filtros
     * @param {Object} options - Opciones de paginacion y filtros
     * @returns {Object} Lista de categorias y metadata
     */
    static async listCategories(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                is_active = null,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;
            const whereClause = {};

            // Filtros
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } },
                    { slug: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (is_active !== null) {
                whereClause.is_active = is_active;
            }

            const { count, rows } = await Category.findAndCountAll({
                where: whereClause,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                categories: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw new Error('Error al listar categorias: ' + error.message);
        }
    }

    /**
     * Crea una nueva categoria
     * @param {Object} categoryData - Datos de la categoria
     * @returns {Object} Categoria creada
     */
    static async createCategory(categoryData) {
        try {
            // Verificar si el nombre o slug ya existen
            const existingCategory = await Category.findOne({
                where: {
                    [Op.or]: [
                        { name: categoryData.name },
                        { slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-') }
                    ]
                }
            });

            if (existingCategory) {
                throw new ConflictError('Ya existe una categoria con ese nombre o slug');
            }

            const category = await Category.create(categoryData);
            return category;
        } catch (error) {
            if (error instanceof ConflictError) {
                throw error;
            }
            throw new Error('Error al crear categoria: ' + error.message);
        }
    }

    /**
     * Actualiza una categoria
     * @param {number} categoryId - ID de la categoria
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Categoria actualizada
     */
    static async updateCategory(categoryId, updateData) {
        try {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            // Verificar si el nuevo nombre o slug ya existen
            if (updateData.name || updateData.slug) {
                const existingCategory = await Category.findOne({
                    where: {
                        [Op.or]: [
                            updateData.name ? { name: updateData.name } : {},
                            updateData.slug ? { slug: updateData.slug } : {}
                        ],
                        id: { [Op.ne]: categoryId }
                    }
                });

                if (existingCategory) {
                    throw new ConflictError('Ya existe una categoria con ese nombre o slug');
                }
            }

            await category.update(updateData);
            return category;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }
            throw new Error('Error al actualizar categoria: ' + error.message);
        }
    }

    /**
     * Activa o desactiva una categoria
     * @param {number} categoryId - ID de la categoria
     * @param {boolean} isActive - Estado activo
     * @returns {Object} Categoria actualizada
     */
    static async toggleCategoryStatus(categoryId, isActive) {
        try {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            await category.update({ is_active: isActive });
            return category;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al cambiar estado de categoria: ' + error.message);
        }
    }

    /**
     * Elimina una categoria (solo si no tiene productos)
     * @param {number} categoryId - ID de la categoria
     * @returns {boolean} True si se elimino exitosamente
     */
    static async deleteCategory(categoryId) {
        try {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            // Verificar si tiene productos asociados
            const productCount = await Product.count({
                where: { category_id: categoryId }
            });

            if (productCount > 0) {
                throw new ValidationError(`No se puede eliminar la categoria. Tiene ${productCount} productos asociados.`);
            }

            await category.destroy();
            return true;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Error al eliminar categoria: ' + error.message);
        }
    }

    /**
     * Obtiene productos de una categoria
     * @param {number} categoryId - ID de la categoria
     * @param {Object} options - Opciones de paginacion y filtros
     * @returns {Object} Lista de productos y metadata
     */
    static async getCategoryProducts(categoryId, options = {}) {
        try {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                throw new NotFoundError('Categoria no encontrada');
            }

            const {
                page = 1,
                limit = 10,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;

            const { count, rows } = await Product.findAndCountAll({
                where: { 
                    category_id: categoryId,
                    is_active: true
                },
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                category: category,
                products: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener productos de categoria: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de categorias
     * @returns {Object} Estadisticas de categorias
     */
    static async getCategoryStats() {
        try {
            const totalCategories = await Category.count();
            const activeCategories = await Category.count({ where: { is_active: true } });
            const inactiveCategories = await Category.count({ where: { is_active: false } });

            // Categorias con mas productos
            const topCategories = await Category.findAll({
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
                order: [[require('sequelize').fn('COUNT', require('sequelize').col('Products.id')), 'DESC']],
                limit: 5
            });

            return {
                total: totalCategories,
                active: activeCategories,
                inactive: inactiveCategories,
                topCategories: topCategories
            };
        } catch (error) {
            throw new Error('Error al obtener estadisticas de categorias: ' + error.message);
        }
    }

    /**
     * Busca categorias por termino de busqueda
     * @param {string} searchTerm - Termino de busqueda
     * @param {Object} options - Opciones de busqueda
     * @returns {Array} Lista de categorias encontradas
     */
    static async searchCategories(searchTerm, options = {}) {
        try {
            const {
                limit = 10,
                includeInactive = false
            } = options;

            const whereClause = {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${searchTerm}%` } },
                    { description: { [Op.iLike]: `%${searchTerm}%` } },
                    { slug: { [Op.iLike]: `%${searchTerm}%` } }
                ]
            };

            if (!includeInactive) {
                whereClause.is_active = true;
            }

            const categories = await Category.findAll({
                where: whereClause,
                limit: parseInt(limit),
                order: [['name', 'ASC']]
            });

            return categories;
        } catch (error) {
            throw new Error('Error al buscar categorias: ' + error.message);
        }
    }
}

module.exports = CategoryService;
