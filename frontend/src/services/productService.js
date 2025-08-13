import apiService from './api';

class ProductService {
  // Obtener todos los productos
  async getProducts(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/products${queryString ? `?${queryString}` : ''}`;
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  // Obtener producto por ID
  async getProductById(id) {
    try {
      return await apiService.get(`/products/${id}`);
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  }

  // Obtener productos por categoria
  async getProductsByCategory(categoryId) {
    try {
      return await apiService.get(`/products?category_id=${categoryId}`);
    } catch (error) {
      console.error('Error obteniendo productos por categoria:', error);
      throw error;
    }
  }

  // Buscar productos
  async searchProducts(query) {
    try {
      return await apiService.get(`/products?search=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Error buscando productos:', error);
      throw error;
    }
  }

  // Crear producto (solo admin)
  async createProduct(productData) {
    try {
      return await apiService.post('/products', productData);
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  }

  // Actualizar producto (solo admin)
  async updateProduct(id, productData) {
    try {
      return await apiService.put(`/products/${id}`, productData);
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }

  // Eliminar producto (solo admin)
  async deleteProduct(id) {
    try {
      return await apiService.delete(`/products/${id}`);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }
}

export default new ProductService();
