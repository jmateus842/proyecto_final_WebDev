import apiService from './api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Login de usuario
  async login(email, password) {
    try {
      const response = await apiService.post('/auth/login', {
        email,
        password,
      });

      if (response.token) {
        this.setToken(response.token);
        this.setUser(response.user);
        return response;
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Registro de usuario
  async register(userData) {
    try {
      const response = await apiService.post('/auth/register', userData);
      
      if (response.token) {
        this.setToken(response.token);
        this.setUser(response.user);
        return response;
      }
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.token = null;
    this.user = null;
  }

  // Verificar si el usuario esta autenticado
  isAuthenticated() {
    return !!this.token;
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.user;
  }

  // Obtener token
  getToken() {
    return this.token;
  }

  // Establecer token
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Establecer usuario
  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Verificar si es admin
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  // Actualizar perfil
  async updateProfile(profileData) {
    try {
      const response = await apiService.put('/auth/profile', profileData);
      this.setUser(response.user);
      return response;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  // Cambiar contrasena
  async changePassword(passwordData) {
    try {
      return await apiService.put('/auth/change-password', passwordData);
    } catch (error) {
      console.error('Error cambiando contrasena:', error);
      throw error;
    }
  }
}

export default new AuthService();
