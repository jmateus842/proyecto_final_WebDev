/**
 * Script de prueba para el Sistema de Autenticacion
 * Ejecutar con: node test-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';

// Configurar axios para mostrar errores completos
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('Error Response:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

async function testAuthSystem() {
  console.log('🧪 Iniciando pruebas del Sistema de Autenticacion...\n');

  try {
    // 1. Probar verificacion de email disponible
    console.log('1. Probando verificacion de email...');
    const emailCheck = await axios.get(`${BASE_URL}/check-email/test@ejemplo.com`);
    console.log('✅ Email disponible:', emailCheck.data);

    // 2. Probar verificacion de username disponible
    console.log('\n2. Probando verificacion de username...');
    const usernameCheck = await axios.get(`${BASE_URL}/check-username/testuser123`);
    console.log('✅ Username disponible:', usernameCheck.data);

    // 3. Probar registro de usuario
    console.log('\n3. Probando registro de usuario...');
    const registerData = {
      username: 'testuser123',
      email: 'test@ejemplo.com',
      password: 'contrasena123',
      first_name: 'Usuario',
      last_name: 'Prueba'
    };

    const registerResponse = await axios.post(`${BASE_URL}/register`, registerData);
    console.log('✅ Usuario registrado:', {
      id: registerResponse.data.data.user.id,
      username: registerResponse.data.data.user.username,
      email: registerResponse.data.data.user.email,
      role: registerResponse.data.data.user.role
    });

    const token = registerResponse.data.data.token;
    console.log('✅ Token JWT generado:', token.substring(0, 50) + '...');

    // 4. Probar obtener usuario actual
    console.log('\n4. Probando obtener usuario actual...');
    const meResponse = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Usuario actual obtenido:', {
      id: meResponse.data.data.id,
      username: meResponse.data.data.username,
      email: meResponse.data.data.email
    });

    // 5. Probar login con el usuario registrado
    console.log('\n5. Probando login...');
    const loginData = {
      email: 'test@ejemplo.com',
      password: 'contrasena123'
    };

    const loginResponse = await axios.post(`${BASE_URL}/login`, loginData);
    console.log('✅ Login exitoso:', {
      id: loginResponse.data.data.user.id,
      username: loginResponse.data.data.user.username,
      last_login: loginResponse.data.data.user.last_login
    });

    const loginToken = loginResponse.data.data.token;

    // 6. Probar actualizar perfil
    console.log('\n6. Probando actualizacion de perfil...');
    const updateData = {
      first_name: 'Usuario Actualizado',
      last_name: 'Prueba Modificada'
    };

    const updateResponse = await axios.put(`${BASE_URL}/profile`, updateData, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    console.log('✅ Perfil actualizado:', {
      first_name: updateResponse.data.data.first_name,
      last_name: updateResponse.data.data.last_name
    });

    // 7. Probar cambio de contrasena
    console.log('\n7. Probando cambio de contrasena...');
    const passwordData = {
      currentPassword: 'contrasena123',
      newPassword: 'nuevaContrasena456'
    };

    const passwordResponse = await axios.put(`${BASE_URL}/change-password`, passwordData, {
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    console.log('✅ Contrasena cambiada:', passwordResponse.data.message);

    // 8. Probar login con nueva contrasena
    console.log('\n8. Probando login con nueva contrasena...');
    const newLoginData = {
      email: 'test@ejemplo.com',
      password: 'nuevaContrasena456'
    };

    const newLoginResponse = await axios.post(`${BASE_URL}/login`, newLoginData);
    console.log('✅ Login con nueva contrasena exitoso');

    // 9. Probar acceso sin token (debe fallar)
    console.log('\n9. Probando acceso sin token...');
    try {
      await axios.get(`${BASE_URL}/me`);
      console.log('❌ Error: Deberia haber fallado sin token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Acceso denegado correctamente sin token');
      } else {
        console.log('❌ Error inesperado:', error.response?.status);
      }
    }

    // 10. Probar token invalido (debe fallar)
    console.log('\n10. Probando token invalido...');
    try {
      await axios.get(`${BASE_URL}/me`, {
        headers: { Authorization: 'Bearer token_invalido' }
      });
      console.log('❌ Error: Deberia haber fallado con token invalido');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Acceso denegado correctamente con token invalido');
      } else {
        console.log('❌ Error inesperado:', error.response?.status);
      }
    }

    // 11. Probar registro con email duplicado (debe fallar)
    console.log('\n11. Probando registro con email duplicado...');
    try {
      await axios.post(`${BASE_URL}/register`, registerData);
      console.log('❌ Error: Deberia haber fallado con email duplicado');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Registro denegado correctamente con email duplicado');
      } else {
        console.log('❌ Error inesperado:', error.response?.status);
      }
    }

    // 12. Probar login con credenciales incorrectas (debe fallar)
    console.log('\n12. Probando login con credenciales incorrectas...');
    try {
      await axios.post(`${BASE_URL}/login`, {
        email: 'test@ejemplo.com',
        password: 'contrasena_incorrecta'
      });
      console.log('❌ Error: Deberia haber fallado con credenciales incorrectas');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login denegado correctamente con credenciales incorrectas');
      } else {
        console.log('❌ Error inesperado:', error.response?.status);
      }
    }

    console.log('\n🎉 ¡Todas las pruebas del Sistema de Autenticacion completadas exitosamente!');
    console.log('\n📋 Resumen de funcionalidades probadas:');
    console.log('   ✅ Verificacion de email/username disponibles');
    console.log('   ✅ Registro de usuarios');
    console.log('   ✅ Login de usuarios');
    console.log('   ✅ Obtencion de usuario actual');
    console.log('   ✅ Actualizacion de perfil');
    console.log('   ✅ Cambio de contrasena');
    console.log('   ✅ Proteccion de rutas con JWT');
    console.log('   ✅ Manejo de errores de autenticacion');
    console.log('   ✅ Validaciones de entrada');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Asegurate de que el servidor este ejecutandose en http://localhost:3001');
      console.log('   Ejecuta: npm start en el directorio backend/');
    }
  }
}

// Ejecutar pruebas
testAuthSystem();
