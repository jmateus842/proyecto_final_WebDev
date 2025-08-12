const { Inventory, Product } = require('../models');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errors');
const { Op } = require('sequelize');

class InventoryService {
    /**
     * Obtiene el inventario de un producto
     * @param {number} productId - ID del producto
     * @returns {Object} Inventario del producto
     */
    static async getInventoryByProductId(productId) {
        try {
            const inventory = await Inventory.findOne({
                where: { product_id: productId },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'price']
                }]
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            return inventory;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener inventario: ' + error.message);
        }
    }

    /**
     * Actualiza la cantidad de stock de un producto
     * @param {number} productId - ID del producto
     * @param {number} quantity - Nueva cantidad
     * @param {string} operation - Tipo de operacion ('add', 'subtract', 'set')
     * @returns {Object} Inventario actualizado
     */
    static async updateStock(productId, quantity, operation = 'set') {
        try {
            const inventory = await Inventory.findOne({
                where: { product_id: productId }
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            let newQuantity;

            switch (operation) {
                case 'add':
                    newQuantity = inventory.quantity + quantity;
                    break;
                case 'subtract':
                    newQuantity = inventory.quantity - quantity;
                    if (newQuantity < 0) {
                        throw new BusinessLogicError('No hay suficiente stock disponible');
                    }
                    break;
                case 'set':
                    newQuantity = quantity;
                    break;
                default:
                    throw new ValidationError('Operacion invalida');
            }

            await inventory.update({ quantity: newQuantity });

            return await this.getInventoryByProductId(productId);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BusinessLogicError || error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Error al actualizar stock: ' + error.message);
        }
    }

    /**
     * Reserva stock para un pedido
     * @param {number} productId - ID del producto
     * @param {number} quantity - Cantidad a reservar
     * @returns {Object} Inventario actualizado
     */
    static async reserveStock(productId, quantity) {
        try {
            const inventory = await Inventory.findOne({
                where: { product_id: productId }
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            if (inventory.quantity < quantity) {
                throw new BusinessLogicError(`Stock insuficiente. Disponible: ${inventory.quantity}, Solicitado: ${quantity}`);
            }

            await inventory.update({
                quantity: inventory.quantity - quantity
            });

            return await this.getInventoryByProductId(productId);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al reservar stock: ' + error.message);
        }
    }

    /**
     * Libera stock reservado (en caso de cancelacion de pedido)
     * @param {number} productId - ID del producto
     * @param {number} quantity - Cantidad a liberar
     * @returns {Object} Inventario actualizado
     */
    static async releaseStock(productId, quantity) {
        try {
            const inventory = await Inventory.findOne({
                where: { product_id: productId }
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            await inventory.update({
                quantity: inventory.quantity + quantity
            });

            return await this.getInventoryByProductId(productId);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al liberar stock: ' + error.message);
        }
    }

    /**
     * Actualiza los limites de stock de un producto
     * @param {number} productId - ID del producto
     * @param {Object} limits - Limites de stock
     * @returns {Object} Inventario actualizado
     */
    static async updateStockLimits(productId, limits) {
        try {
            const { min_stock, max_stock } = limits;

            if (min_stock >= max_stock) {
                throw new ValidationError('El stock minimo debe ser menor al stock maximo');
            }

            const inventory = await Inventory.findOne({
                where: { product_id: productId }
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            await inventory.update({
                min_stock: min_stock,
                max_stock: max_stock
            });

            return await this.getInventoryByProductId(productId);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Error al actualizar limites de stock: ' + error.message);
        }
    }

    /**
     * Lista productos con stock bajo
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Lista de productos con stock bajo
     */
    static async getLowStockProducts(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                threshold = null,
                sortBy = 'quantity',
                sortOrder = 'ASC'
            } = options;

            const offset = (page - 1) * limit;
            const whereClause = {};

            if (threshold !== null) {
                whereClause.quantity = { [Op.lte]: threshold };
            } else {
                whereClause.quantity = { [Op.lte]: require('sequelize').col('min_stock') };
            }

            const { count, rows } = await Inventory.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true },
                    attributes: ['id', 'name', 'sku', 'price']
                }],
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
            throw new Error('Error al obtener productos con stock bajo: ' + error.message);
        }
    }

    /**
     * Lista productos sin stock
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Lista de productos sin stock
     */
    static async getOutOfStockProducts(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'updated_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;

            const { count, rows } = await Inventory.findAndCountAll({
                where: { quantity: 0 },
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true },
                    attributes: ['id', 'name', 'sku', 'price']
                }],
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
            throw new Error('Error al obtener productos sin stock: ' + error.message);
        }
    }

    /**
     * Obtiene alertas de inventario
     * @param {Object} options - Opciones de consulta
     * @returns {Object} Alertas de inventario
     */
    static async getInventoryAlerts(options = {}) {
        try {
            const {
                includeOutOfStock = true,
                includeLowStock = true,
                includeOverStock = false
            } = options;

            const alerts = {};

            if (includeOutOfStock) {
                alerts.outOfStock = await Inventory.count({
                    where: { quantity: 0 },
                    include: [{
                        model: Product,
                        as: 'product',
                        where: { is_active: true }
                    }]
                });
            }

            if (includeLowStock) {
                alerts.lowStock = await Inventory.count({
                    where: {
                        quantity: {
                            [Op.and]: [
                                { [Op.gt]: 0 },
                                { [Op.lte]: require('sequelize').col('min_stock') }
                            ]
                        }
                    },
                    include: [{
                        model: Product,
                        as: 'product',
                        where: { is_active: true }
                    }]
                });
            }

            if (includeOverStock) {
                alerts.overStock = await Inventory.count({
                    where: {
                        quantity: { [Op.gte]: require('sequelize').col('max_stock') }
                    },
                    include: [{
                        model: Product,
                        as: 'product',
                        where: { is_active: true }
                    }]
                });
            }

            return alerts;
        } catch (error) {
            throw new Error('Error al obtener alertas de inventario: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de inventario
     * @returns {Object} Estadisticas de inventario
     */
    static async getInventoryStats() {
        try {
            const totalProducts = await Inventory.count({
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true }
                }]
            });

            const outOfStockProducts = await Inventory.count({
                where: { quantity: 0 },
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true }
                }]
            });

            const lowStockProducts = await Inventory.count({
                where: {
                    quantity: {
                        [Op.and]: [
                            { [Op.gt]: 0 },
                            { [Op.lte]: require('sequelize').col('min_stock') }
                        ]
                    }
                },
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true }
                }]
            });

            const overStockProducts = await Inventory.count({
                where: {
                    quantity: { [Op.gte]: require('sequelize').col('max_stock') }
                },
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true }
                }]
            });

            // Valor total del inventario
            const totalValue = await Inventory.sum('quantity', {
                include: [{
                    model: Product,
                    as: 'product',
                    where: { is_active: true },
                    attributes: []
                }]
            });

            return {
                totalProducts,
                outOfStock: outOfStockProducts,
                lowStock: lowStockProducts,
                overStock: overStockProducts,
                totalValue: totalValue || 0
            };
        } catch (error) {
            throw new Error('Error al obtener estadisticas de inventario: ' + error.message);
        }
    }

    /**
     * Verifica disponibilidad de stock para un pedido
     * @param {Array} items - Items del pedido
     * @returns {Object} Resultado de verificacion
     */
    static async checkStockAvailability(items) {
        try {
            const results = [];
            let allAvailable = true;

            for (const item of items) {
                const inventory = await Inventory.findOne({
                    where: { product_id: item.product_id },
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'sku']
                    }]
                });

                if (!inventory) {
                    results.push({
                        product_id: item.product_id,
                        product_name: 'Producto no encontrado',
                        requested: item.quantity,
                        available: 0,
                        available: false,
                        message: 'Producto no encontrado'
                    });
                    allAvailable = false;
                    continue;
                }

                const available = inventory.quantity >= item.quantity;
                if (!available) {
                    allAvailable = false;
                }

                results.push({
                    product_id: item.product_id,
                    product_name: inventory.product.name,
                    requested: item.quantity,
                    available: inventory.quantity,
                    inStock: available,
                    message: available ? 'Stock disponible' : `Stock insuficiente. Disponible: ${inventory.quantity}`
                });
            }

            return {
                allAvailable,
                items: results
            };
        } catch (error) {
            throw new Error('Error al verificar disponibilidad de stock: ' + error.message);
        }
    }

    /**
     * Procesa ajuste de inventario
     * @param {number} productId - ID del producto
     * @param {number} adjustment - Ajuste (positivo o negativo)
     * @param {string} reason - Razon del ajuste
     * @returns {Object} Inventario actualizado
     */
    static async processInventoryAdjustment(productId, adjustment, reason) {
        try {
            const inventory = await Inventory.findOne({
                where: { product_id: productId }
            });

            if (!inventory) {
                throw new NotFoundError('Inventario no encontrado para este producto');
            }

            const newQuantity = inventory.quantity + adjustment;
            if (newQuantity < 0) {
                throw new BusinessLogicError('El ajuste resultaria en stock negativo');
            }

            await inventory.update({ quantity: newQuantity });

            // TODO: Registrar el ajuste en un log de auditoria
            // await InventoryLog.create({
            //     product_id: productId,
            //     adjustment: adjustment,
            //     reason: reason,
            //     previous_quantity: inventory.quantity,
            //     new_quantity: newQuantity
            // });

            return await this.getInventoryByProductId(productId);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
                throw error;
            }
            throw new Error('Error al procesar ajuste de inventario: ' + error.message);
        }
    }
}

module.exports = InventoryService;
