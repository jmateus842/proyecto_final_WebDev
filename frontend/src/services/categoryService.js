import apiService from './api';

class CategoryService {
  // Obtener todas las categorias
  async getCategories() {
    try {
      return await apiService.get('/categories');
    } catch (error) {
      console.error('Error obteniendo categorias:', error);
      throw error;
    }
  }

  // Obtener categoria por ID
  async getCategoryById(id) {
    try {
      return await apiService.get(`/categories/${id}`);
    } catch (error) {
      console.error('Error obteniendo categoria:', error);
      throw error;
    }
  }

  // Obtener categoria por slug
  async getCategoryBySlug(slug) {
    try {
      return await apiService.get(`/categories/slug/${slug}`);
    } catch (error) {
      console.error('Error obteniendo categoria por slug:', error);
      throw error;
    }
  }

  // Crear categoria (solo admin)
  async createCategory(categoryData) {
    try {
      return await apiService.post('/categories', categoryData);
    } catch (error) {
      console.error('Error creando categoria:', error);
      throw error;
    }
  }

  // Actualizar categoria (solo admin)
  async updateCategory(id, categoryData) {
    try {
      return await apiService.put(`/categories/${id}`, categoryData);
    } catch (error) {
      console.error('Error actualizando categoria:', error);
      throw error;
    }
  }

  // Eliminar categoria (solo admin)
  async deleteCategory(id) {
    try {
      return await apiService.delete(`/categories/${id}`);
    } catch (error) {
      console.error('Error eliminando categoria:', error);
      throw error;
    }
  }
}

export default new CategoryService();
