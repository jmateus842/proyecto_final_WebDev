const { Review, User, Product, Order, OrderItem } = require('../models');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');
const { sequelize } = require('../config/database');

class ReviewService {
    /**
     * Crea una nueva resena con verificacion de compra
     * @param {Object} reviewData - Datos de la resena
     * @returns {Object} Resena creada
     */
    static async createReview(reviewData) {
        const transaction = await sequelize.transaction();
        
        try {
            // Validar que el usuario existe
            const user = await User.findByPk(reviewData.user_id);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // Validar que el producto existe
            const product = await Product.findByPk(reviewData.product_id);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            // Verificar si ya existe una resena del usuario para este producto
            const existingReview = await Review.findOne({
                where: {
                    product_id: reviewData.product_id,
                    user_id: reviewData.user_id
                }
            });

            if (existingReview) {
                throw new ConflictError('Ya has resenado este producto');
            }

            // Verificar si el usuario ha comprado el producto (para marcar como compra verificada)
            const hasPurchased = await this.verifyPurchase(reviewData.user_id, reviewData.product_id);
            
            const review = await Review.create({
                product_id: reviewData.product_id,
                user_id: reviewData.user_id,
                rating: reviewData.rating,
                comment: reviewData.comment,
                is_verified_purchase: hasPurchased
            }, { transaction });

            // Actualizar rating promedio del producto
            await this.updateProductAverageRating(reviewData.product_id, transaction);

            await transaction.commit();

            // Retornar resena con datos del usuario
            return await this.getReviewById(review.id, { includeUser: true, includeProduct: true });

        } catch (error) {
            await transaction.rollback();
            if (error instanceof ValidationError || 
                error instanceof NotFoundError || 
                error instanceof ConflictError || 
                error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al crear resena: ' + error.message);
        }
    }

    /**
     * Obtiene una resena por ID
     * @param {number} reviewId - ID de la resena
     * @param {Object} options - Opciones adicionales
     * @returns {Object} Resena encontrada
     */
    static async getReviewById(reviewId, options = {}) {
        try {
            const {
                includeUser = false,
                includeProduct = false
            } = options;

            const includeClause = [];
            
            if (includeUser) {
                includeClause.push({
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name']
                });
            }

            if (includeProduct) {
                includeClause.push({
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'image_url']
                });
            }

            const review = await Review.findByPk(reviewId, {
                include: includeClause
            });

            if (!review) {
                throw new NotFoundError('Resena no encontrada');
            }

            return review;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener resena: ' + error.message);
        }
    }

    /**
     * Obtiene resenas de un producto
     * @param {number} productId - ID del producto
     * @param {Object} options - Opciones de paginacion y filtros
     * @returns {Object} Lista de resenas del producto
     */
    static async getProductReviews(productId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                rating = null,
                verifiedOnly = false,
                includeUser = true
            } = options;

            // Validar que el producto existe
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            const whereClause = { product_id: productId };
            if (rating) {
                whereClause.rating = rating;
            }
            if (verifiedOnly) {
                whereClause.is_verified_purchase = true;
            }

            const includeClause = [];
            if (includeUser) {
                includeClause.push({
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name']
                });
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await Review.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: offset
            });

            return {
                reviews: rows,
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
            throw new Error('Error al obtener resenas del producto: ' + error.message);
        }
    }

    /**
     * Obtiene resenas de un usuario
     * @param {number} userId - ID del usuario
     * @param {Object} options - Opciones de paginacion
     * @returns {Object} Lista de resenas del usuario
     */
    static async getUserReviews(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10
            } = options;

            // Validar que el usuario existe
            const user = await User.findByPk(userId);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await Review.findAndCountAll({
                where: { user_id: userId },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'image_url']
                }],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: offset
            });

            return {
                reviews: rows,
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
            throw new Error('Error al obtener resenas del usuario: ' + error.message);
        }
    }

    /**
     * Actualiza una resena existente
     * @param {number} reviewId - ID de la resena
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Resena actualizada
     */
    static async updateReview(reviewId, updateData) {
        const transaction = await sequelize.transaction();
        
        try {
            const review = await Review.findByPk(reviewId, { transaction });
            if (!review) {
                throw new NotFoundError('Resena no encontrada');
            }

            // Validar rating si se proporciona
            if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
                throw new ValidationError('El rating debe estar entre 1 y 5');
            }

            await review.update(updateData, { transaction });

            // Actualizar rating promedio del producto
            await this.updateProductAverageRating(review.product_id, transaction);

            await transaction.commit();

            return await this.getReviewById(reviewId, { includeUser: true, includeProduct: true });

        } catch (error) {
            await transaction.rollback();
            if (error instanceof ValidationError || 
                error instanceof NotFoundError || 
                error instanceof ConflictError || 
                error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al actualizar resena: ' + error.message);
        }
    }

    /**
     * Elimina una resena
     * @param {number} reviewId - ID de la resena
     * @returns {boolean} True si se elimino correctamente
     */
    static async deleteReview(reviewId) {
        const transaction = await sequelize.transaction();
        
        try {
            const review = await Review.findByPk(reviewId, { transaction });
            if (!review) {
                throw new NotFoundError('Resena no encontrada');
            }

            const productId = review.product_id;
            await review.destroy({ transaction });

            // Actualizar rating promedio del producto
            await this.updateProductAverageRating(productId, transaction);

            await transaction.commit();
            return true;

        } catch (error) {
            await transaction.rollback();
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al eliminar resena: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de resenas de un producto
     * @param {number} productId - ID del producto
     * @returns {Object} Estadisticas de resenas
     */
    static async getProductReviewStats(productId) {
        try {
            // Validar que el producto existe
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new NotFoundError('Producto no encontrado');
            }

            const stats = await Review.findOne({
                where: { product_id: productId },
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 5 THEN 1 END')), 'fiveStar'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 4 THEN 1 END')), 'fourStar'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 3 THEN 1 END')), 'threeStar'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 2 THEN 1 END')), 'twoStar'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 1 THEN 1 END')), 'oneStar'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_verified_purchase = true THEN 1 END')), 'verifiedReviews']
                ]
            });

            const averageRating = parseFloat(stats?.dataValues?.averageRating || 0);
            const totalReviews = parseInt(stats?.dataValues?.totalReviews || 0);

            return {
                averageRating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
                totalReviews: totalReviews,
                fiveStar: parseInt(stats?.dataValues?.fiveStar || 0),
                fourStar: parseInt(stats?.dataValues?.fourStar || 0),
                threeStar: parseInt(stats?.dataValues?.threeStar || 0),
                twoStar: parseInt(stats?.dataValues?.twoStar || 0),
                oneStar: parseInt(stats?.dataValues?.oneStar || 0),
                verifiedReviews: parseInt(stats?.dataValues?.verifiedReviews || 0),
                ratingDistribution: totalReviews > 0 ? {
                    fiveStar: Math.round((parseInt(stats?.dataValues?.fiveStar || 0) / totalReviews) * 100),
                    fourStar: Math.round((parseInt(stats?.dataValues?.fourStar || 0) / totalReviews) * 100),
                    threeStar: Math.round((parseInt(stats?.dataValues?.threeStar || 0) / totalReviews) * 100),
                    twoStar: Math.round((parseInt(stats?.dataValues?.twoStar || 0) / totalReviews) * 100),
                    oneStar: Math.round((parseInt(stats?.dataValues?.oneStar || 0) / totalReviews) * 100)
                } : null
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener estadisticas de resenas: ' + error.message);
        }
    }

    /**
     * Obtiene resenas destacadas (con mejor rating)
     * @param {number} limit - Limite de resenas a retornar
     * @returns {Array} Lista de resenas destacadas
     */
    static async getFeaturedReviews(limit = 5) {
        try {
            const reviews = await Review.findAll({
                where: {
                    rating: { [sequelize.Op.gte]: 4 },
                    comment: { [sequelize.Op.ne]: null }
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name']
                }, {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'image_url']
                }],
                order: [
                    ['rating', 'DESC'],
                    ['created_at', 'DESC']
                ],
                limit: parseInt(limit)
            });

            return reviews;
        } catch (error) {
            throw new Error('Error al obtener resenas destacadas: ' + error.message);
        }
    }

    /**
     * Verifica si un usuario ha comprado un producto
     * @param {number} userId - ID del usuario
     * @param {number} productId - ID del producto
     * @returns {boolean} True si el usuario ha comprado el producto
     */
    static async verifyPurchase(userId, productId) {
        try {
            const orderItem = await OrderItem.findOne({
                where: { product_id: productId },
                include: [{
                    model: Order,
                    as: 'order',
                    where: { 
                        user_id: userId,
                        status: { [sequelize.Op.in]: ['confirmed', 'shipped', 'delivered'] }
                    },
                    attributes: []
                }]
            });

            return !!orderItem;
        } catch (error) {
            throw new Error('Error al verificar compra: ' + error.message);
        }
    }

    /**
     * Actualiza el rating promedio de un producto
     * @param {number} productId - ID del producto
     * @param {Object} transaction - Transaccion de base de datos
     */
    static async updateProductAverageRating(productId, transaction) {
        try {
            const stats = await Review.findOne({
                where: { product_id: productId },
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
                ],
                transaction
            });

            const averageRating = parseFloat(stats?.dataValues?.averageRating || 0);
            const totalReviews = parseInt(stats?.dataValues?.totalReviews || 0);

            await Product.update({
                average_rating: Math.round(averageRating * 10) / 10,
                review_count: totalReviews
            }, {
                where: { id: productId },
                transaction
            });
        } catch (error) {
            throw new Error('Error al actualizar rating promedio: ' + error.message);
        }
    }

    /**
     * Obtiene resenas recientes
     * @param {number} limit - Limite de resenas a retornar
     * @returns {Array} Lista de resenas recientes
     */
    static async getRecentReviews(limit = 10) {
        try {
            const reviews = await Review.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name']
                }, {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'image_url']
                }],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit)
            });

            return reviews;
        } catch (error) {
            throw new Error('Error al obtener resenas recientes: ' + error.message);
        }
    }
}

module.exports = ReviewService;
