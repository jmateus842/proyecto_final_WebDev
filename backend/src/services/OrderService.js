const { Order, OrderItem, User, Product, Inventory } = require('../models');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');
const { sequelize } = require('../config/database');

class OrderService {
    /**
     * Crea un nuevo pedido con validacion de stock
     * @param {Object} orderData - Datos del pedido
     * @param {Array} items - Array de items del pedido
     * @returns {Object} Pedido creado con items
     */
    static async createOrder(orderData, items) {
        const transaction = await sequelize.transaction();
        
        try {
            // Validar que el usuario existe
            const user = await User.findByPk(orderData.user_id);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // Validar items del pedido
            if (!items || items.length === 0) {
                throw new ValidationError('El pedido debe contener al menos un item');
            }

            // Verificar stock disponible para todos los items
            const stockValidation = await this.validateStockAvailability(items);
            if (!stockValidation.available) {
                throw new BusinessLogicError(`Stock insuficiente para: ${stockValidation.unavailableItems.join(', ')}`);
            }

            // Calcular total del pedido
            const totalAmount = await this.calculateOrderTotal(items);

            // Crear el pedido
            const order = await Order.create({
                user_id: orderData.user_id,
                total_amount: totalAmount,
                shipping_address: orderData.shipping_address,
                billing_address: orderData.billing_address,
                status: 'pending',
                payment_status: 'pending'
            }, { transaction });

            // Crear items del pedido y reservar stock
            const orderItems = [];
            for (const item of items) {
                const product = await Product.findByPk(item.product_id);
                if (!product) {
                    throw new NotFoundError(`Producto con ID ${item.product_id} no encontrado`);
                }

                const orderItem = await OrderItem.create({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: product.price,
                    total_price: product.price * item.quantity
                }, { transaction });

                // Reservar stock
                await Inventory.update({
                    quantity: sequelize.literal(`quantity - ${item.quantity}`)
                }, {
                    where: { product_id: item.product_id },
                    transaction
                });

                orderItems.push(orderItem);
            }

            await transaction.commit();

            // Retornar pedido completo con items
            return await this.getOrderById(order.id, { includeItems: true, includeUser: true });

        } catch (error) {
            await transaction.rollback();
            if (error instanceof ValidationError || 
                error instanceof NotFoundError || 
                error instanceof ConflictError || 
                error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al crear pedido: ' + error.message);
        }
    }

    /**
     * Obtiene un pedido por ID
     * @param {number} orderId - ID del pedido
     * @param {Object} options - Opciones adicionales
     * @returns {Object} Pedido encontrado
     */
    static async getOrderById(orderId, options = {}) {
        try {
            const {
                includeItems = false,
                includeUser = false,
                includeProducts = false
            } = options;

            const includeClause = [];
            
            if (includeUser) {
                includeClause.push({
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name', 'email']
                });
            }

            if (includeItems) {
                const itemInclude = {
                    model: OrderItem,
                    as: 'orderItems',
                    attributes: ['id', 'quantity', 'unit_price', 'total_price', 'created_at']
                };

                if (includeProducts) {
                    itemInclude.include = [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku', 'image_url']
                    }];
                }

                includeClause.push(itemInclude);
            }

            const order = await Order.findByPk(orderId, {
                include: includeClause
            });

            if (!order) {
                throw new NotFoundError('Pedido no encontrado');
            }

            return order;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener pedido: ' + error.message);
        }
    }

    /**
     * Obtiene pedidos por usuario
     * @param {number} userId - ID del usuario
     * @param {Object} options - Opciones de paginacion y filtros
     * @returns {Object} Lista de pedidos del usuario
     */
    static async getUserOrders(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status = null,
                includeItems = false
            } = options;

            const whereClause = { user_id: userId };
            if (status) {
                whereClause.status = status;
            }

            const includeClause = [];
            if (includeItems) {
                includeClause.push({
                    model: OrderItem,
                    as: 'orderItems',
                    attributes: ['id', 'quantity', 'unit_price', 'total_price'],
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku', 'image_url']
                    }]
                });
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await Order.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: offset
            });

            return {
                orders: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw new Error('Error al obtener pedidos del usuario: ' + error.message);
        }
    }

    /**
     * Actualiza el estado de un pedido
     * @param {number} orderId - ID del pedido
     * @param {string} newStatus - Nuevo estado
     * @returns {Object} Pedido actualizado
     */
    static async updateOrderStatus(orderId, newStatus) {
        const transaction = await sequelize.transaction();
        
        try {
            const order = await Order.findByPk(orderId, { transaction });
            if (!order) {
                throw new NotFoundError('Pedido no encontrado');
            }

            const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                throw new ValidationError('Estado de pedido invalido');
            }

            // Si se cancela el pedido, liberar stock
            if (newStatus === 'cancelled' && order.status !== 'cancelled') {
                await this.releaseOrderStock(orderId, transaction);
            }

            // Si se confirma el pedido, verificar stock nuevamente
            if (newStatus === 'confirmed' && order.status === 'pending') {
                const orderItems = await OrderItem.findAll({
                    where: { order_id: orderId },
                    transaction
                });

                const stockValidation = await this.validateStockAvailability(
                    orderItems.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity
                    }))
                );

                if (!stockValidation.available) {
                    throw new BusinessLogicError('Stock insuficiente para confirmar el pedido');
                }
            }

            await order.update({ status: newStatus }, { transaction });
            await transaction.commit();

            return await this.getOrderById(orderId, { includeItems: true });

        } catch (error) {
            await transaction.rollback();
            if (error instanceof ValidationError || 
                error instanceof NotFoundError || 
                error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al actualizar estado del pedido: ' + error.message);
        }
    }

    /**
     * Cancela un pedido y libera el stock
     * @param {number} orderId - ID del pedido
     * @returns {Object} Pedido cancelado
     */
    static async cancelOrder(orderId) {
        const transaction = await sequelize.transaction();
        
        try {
            const order = await Order.findByPk(orderId, { transaction });
            if (!order) {
                throw new NotFoundError('Pedido no encontrado');
            }

            if (order.status === 'cancelled') {
                throw new ConflictError('El pedido ya esta cancelado');
            }

            if (order.status === 'delivered') {
                throw new BusinessLogicError('No se puede cancelar un pedido ya entregado');
            }

            // Liberar stock
            await this.releaseOrderStock(orderId, transaction);

            // Actualizar estado
            await order.update({ 
                status: 'cancelled',
                payment_status: 'refunded'
            }, { transaction });

            await transaction.commit();

            return await this.getOrderById(orderId, { includeItems: true });

        } catch (error) {
            await transaction.rollback();
            if (error instanceof ValidationError || 
                error instanceof NotFoundError || 
                error instanceof ConflictError || 
                error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al cancelar pedido: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de pedidos
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} Estadisticas de pedidos
     */
    static async getOrderStats(filters = {}) {
        try {
            const whereClause = {};
            if (filters.status) {
                whereClause.status = filters.status;
            }
            if (filters.user_id) {
                whereClause.user_id = filters.user_id;
            }

            const stats = await Order.findOne({
                where: whereClause,
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
                    [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
                    [sequelize.fn('AVG', sequelize.col('total_amount')), 'averageOrderValue']
                ]
            });

            const statusCounts = await Order.findAll({
                where: whereClause,
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            return {
                totalOrders: parseInt(stats?.dataValues?.totalOrders || 0),
                totalRevenue: parseFloat(stats?.dataValues?.totalRevenue || 0),
                averageOrderValue: parseFloat(stats?.dataValues?.averageOrderValue || 0),
                statusBreakdown: statusCounts.reduce((acc, item) => {
                    acc[item.status] = parseInt(item.dataValues.count);
                    return acc;
                }, {})
            };
        } catch (error) {
            throw new Error('Error al obtener estadisticas de pedidos: ' + error.message);
        }
    }

    /**
     * Busca pedido por numero de pedido
     * @param {string} orderNumber - Numero del pedido
     * @returns {Object} Pedido encontrado
     */
    static async findByOrderNumber(orderNumber) {
        try {
            const order = await Order.findOne({
                where: { order_number: orderNumber },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'first_name', 'last_name']
                }, {
                    model: OrderItem,
                    as: 'orderItems',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku', 'image_url']
                    }]
                }]
            });

            if (!order) {
                throw new NotFoundError('Pedido no encontrado');
            }

            return order;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al buscar pedido: ' + error.message);
        }
    }

    /**
     * Valida disponibilidad de stock para items
     * @param {Array} items - Array de items a validar
     * @returns {Object} Resultado de validacion
     */
    static async validateStockAvailability(items) {
        const unavailableItems = [];

        for (const item of items) {
            const inventory = await Inventory.findOne({
                where: { product_id: item.product_id }
            });

            if (!inventory || inventory.quantity < item.quantity) {
                const product = await Product.findByPk(item.product_id);
                unavailableItems.push(product ? product.name : `Producto ID ${item.product_id}`);
            }
        }

        return {
            available: unavailableItems.length === 0,
            unavailableItems
        };
    }

    /**
     * Calcula el total de un pedido
     * @param {Array} items - Array de items del pedido
     * @returns {number} Total del pedido
     */
    static async calculateOrderTotal(items) {
        let total = 0;

        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            if (!product) {
                throw new NotFoundError(`Producto con ID ${item.product_id} no encontrado`);
            }
            total += product.price * item.quantity;
        }

        return total;
    }

    /**
     * Libera el stock de un pedido
     * @param {number} orderId - ID del pedido
     * @param {Object} transaction - Transaccion de base de datos
     */
    static async releaseOrderStock(orderId, transaction) {
        const orderItems = await OrderItem.findAll({
            where: { order_id: orderId },
            transaction
        });

        for (const item of orderItems) {
            await Inventory.update({
                quantity: sequelize.literal(`quantity + ${item.quantity}`)
            }, {
                where: { product_id: item.product_id },
                transaction
            });
        }
    }
}

module.exports = OrderService;
