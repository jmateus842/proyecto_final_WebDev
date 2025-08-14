const { User } = require('../models');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');
const { Op } = require('sequelize');

class UserService {
    /**
     * Obtiene un usuario por ID
     * @param {number} userId - ID del usuario
     * @param {Object} currentUser - Usuario actual (para verificaciones de autorizacion)
     * @returns {Object} Usuario encontrado
     */
    static async getUserById(userId, currentUser = null) {
        try {
            const user = await User.findByPk(userId);
            
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // Verificar autorizacion: solo el propio usuario o admin puede ver el perfil completo
            if (currentUser && currentUser.id !== userId && currentUser.role !== 'admin') {
                throw new AuthorizationError('No tienes permisos para ver este perfil');
            }

            return user.toPublicJSON();
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al obtener usuario: ' + error.message);
        }
    }

    /**
     * Obtiene el perfil del usuario actual
     * @param {number} userId - ID del usuario
     * @returns {Object} Perfil del usuario
     */
    static async getCurrentUserProfile(userId) {
        try {
            const user = await User.findByPk(userId);
            
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            return user.toPublicJSON();
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error('Error al obtener perfil: ' + error.message);
        }
    }

    /**
     * Actualiza el perfil de un usuario
     * @param {number} userId - ID del usuario
     * @param {Object} updateData - Datos a actualizar
     * @param {Object} currentUser - Usuario actual
     * @returns {Object} Usuario actualizado
     */
    static async updateUserProfile(userId, updateData, currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.id !== userId && currentUser.role !== 'admin') {
                throw new AuthorizationError('No tienes permisos para actualizar este perfil');
            }

            const user = await User.findByPk(userId);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // Si no es admin, no puede cambiar el rol
            if (currentUser.role !== 'admin' && updateData.role) {
                delete updateData.role;
            }

            // Si no es admin, no puede cambiar el estado activo
            if (currentUser.role !== 'admin' && updateData.is_active !== undefined) {
                delete updateData.is_active;
            }

            // Verificar si el email o username ya existen
            if (updateData.email || updateData.username) {
                const existingUser = await User.findOne({
                    where: {
                        [Op.or]: [
                            updateData.email ? { email: updateData.email } : {},
                            updateData.username ? { username: updateData.username } : {}
                        ],
                        id: { [Op.ne]: userId }
                    }
                });

                if (existingUser) {
                    throw new ValidationError('El email o username ya estan en uso');
                }
            }

            await user.update(updateData);
            return user.toPublicJSON();
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al actualizar perfil: ' + error.message);
        }
    }

    /**
     * Lista usuarios con paginacion y filtros (solo admin)
     * @param {Object} options - Opciones de paginacion y filtros
     * @param {Object} currentUser - Usuario actual
     * @returns {Object} Lista de usuarios y metadata
     */
    static async listUsers(options = {}, currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.role !== 'admin') {
                throw new AuthorizationError('Solo los administradores pueden listar usuarios');
            }

            const {
                page = 1,
                limit = 10,
                search = '',
                role = '',
                is_active = null,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;
            const whereClause = {};

            // Filtros
            if (search) {
                whereClause[Op.or] = [
                                    { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { first_name: { [Op.like]: `%${search}%` } },
                { last_name: { [Op.like]: `%${search}%` } }
                ];
            }

            if (role) {
                whereClause.role = role;
            }

            if (is_active !== null) {
                whereClause.is_active = is_active;
            }

            const { count, rows } = await User.findAndCountAll({
                where: whereClause,
                attributes: { exclude: ['password', 'reset_token', 'reset_token_expires'] },
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                users: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            if (error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al listar usuarios: ' + error.message);
        }
    }

    /**
     * Activa o desactiva un usuario (solo admin)
     * @param {number} userId - ID del usuario
     * @param {boolean} isActive - Estado activo
     * @param {Object} currentUser - Usuario actual
     * @returns {Object} Usuario actualizado
     */
    static async toggleUserStatus(userId, isActive, currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.role !== 'admin') {
                throw new AuthorizationError('Solo los administradores pueden cambiar el estado de usuarios');
            }

            const user = await User.findByPk(userId);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // No permitir desactivar el propio usuario
            if (currentUser.id === userId) {
                throw new ValidationError('No puedes desactivar tu propia cuenta');
            }

            await user.update({ is_active: isActive });
            return user.toPublicJSON();
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al cambiar estado de usuario: ' + error.message);
        }
    }

    /**
     * Cambia el rol de un usuario (solo admin)
     * @param {number} userId - ID del usuario
     * @param {string} newRole - Nuevo rol
     * @param {Object} currentUser - Usuario actual
     * @returns {Object} Usuario actualizado
     */
    static async changeUserRole(userId, newRole, currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.role !== 'admin') {
                throw new AuthorizationError('Solo los administradores pueden cambiar roles');
            }

            if (!['customer', 'admin'].includes(newRole)) {
                throw new ValidationError('Rol invalido');
            }

            const user = await User.findByPk(userId);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // No permitir cambiar el propio rol
            if (currentUser.id === userId) {
                throw new ValidationError('No puedes cambiar tu propio rol');
            }

            await user.update({ role: newRole });
            return user.toPublicJSON();
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al cambiar rol de usuario: ' + error.message);
        }
    }

    /**
     * Elimina un usuario (solo admin)
     * @param {number} userId - ID del usuario
     * @param {Object} currentUser - Usuario actual
     * @returns {boolean} True si se elimino exitosamente
     */
    static async deleteUser(userId, currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.role !== 'admin') {
                throw new AuthorizationError('Solo los administradores pueden eliminar usuarios');
            }

            const user = await User.findByPk(userId);
            if (!user) {
                throw new NotFoundError('Usuario no encontrado');
            }

            // No permitir eliminar el propio usuario
            if (currentUser.id === userId) {
                throw new ValidationError('No puedes eliminar tu propia cuenta');
            }

            await user.destroy();
            return true;
        } catch (error) {
            if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al eliminar usuario: ' + error.message);
        }
    }

    /**
     * Obtiene estadisticas de usuarios (solo admin)
     * @param {Object} currentUser - Usuario actual
     * @returns {Object} Estadisticas de usuarios
     */
    static async getUserStats(currentUser) {
        try {
            // Verificar autorizacion
            if (currentUser.role !== 'admin') {
                throw new AuthorizationError('Solo los administradores pueden ver estadisticas');
            }

            const totalUsers = await User.count();
            const activeUsers = await User.count({ where: { is_active: true } });
            const adminUsers = await User.count({ where: { role: 'admin' } });
            const customerUsers = await User.count({ where: { role: 'customer' } });

            // Usuarios registrados en los ultimos 30 dias
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentUsers = await User.count({
                where: {
                    created_at: {
                        [Op.gte]: thirtyDaysAgo
                    }
                }
            });

            return {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
                admins: adminUsers,
                customers: customerUsers,
                recentRegistrations: recentUsers
            };
        } catch (error) {
            if (error instanceof AuthorizationError) {
                throw error;
            }
            throw new Error('Error al obtener estadisticas: ' + error.message);
        }
    }
}

module.exports = UserService;
