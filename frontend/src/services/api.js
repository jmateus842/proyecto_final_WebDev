// Servicio base para comunicacion con la API del backend
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Metodo base para hacer peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar token de autenticacion si existe
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en peticion API:', error);
      throw error;
    }
  }

  // Metodos GET
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // Metodos POST
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Metodos PUT
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Metodos DELETE
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
