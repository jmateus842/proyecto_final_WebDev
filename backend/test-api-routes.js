const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Funcion para imprimir resultados
const printResult = (testName, success, message = '') => {
  const color = success ? colors.green : colors.red;
  const status = success ? '✅ PASO' : '❌ FALLO';
  console.log(`${color}${status}${colors.reset} ${testName} ${message}`);
};

// Funcion para hacer requests HTTP
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

// Tests de rutas publicas
const testPublicRoutes = async () => {
  console.log('\n🔍 Probando rutas publicas...\n');

  // Test 1: Health check
  const health = await makeRequest('GET', '/health');
  printResult('Health Check', health.success, `Status: ${health.status}`);

  // Test 2: Listar productos
  const products = await makeRequest('GET', '/products');
  printResult('Listar Productos', products.success, `Status: ${products.status}`);

  // Test 3: Listar categorias
  const categories = await makeRequest('GET', '/categories');
  printResult('Listar Categorias', categories.success, `Status: ${products.status}`);

  // Test 4: Estadisticas de productos
  const productStats = await makeRequest('GET', '/products/stats');
  printResult('Estadisticas de Productos', productStats.success, `Status: ${productStats.status}`);

  // Test 5: Estadisticas de inventario
  const inventoryStats = await makeRequest('GET', '/inventory/stats');
  printResult('Estadisticas de Inventario', inventoryStats.success, `Status: ${inventoryStats.status}`);
};

// Tests de autenticacion
const testAuthRoutes = async () => {
  console.log('\n🔐 Probando rutas de autenticacion...\n');

  // Test 1: Registro de usuario
  const registerData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  const register = await makeRequest('POST', '/auth/register', registerData);
  printResult('Registro de Usuario', register.success, `Status: ${register.status}`);

  // Test 2: Login de usuario
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };

  const login = await makeRequest('POST', '/auth/login', loginData);
  printResult('Login de Usuario', login.success, `Status: ${login.status}`);

  return login.success ? login.data.token : null;
};

// Tests de rutas protegidas
const testProtectedRoutes = async (token) => {
  if (!token) {
    console.log('\n⚠️  No se pudo obtener token, saltando rutas protegidas...\n');
    return;
  }

  console.log('\n🛡️  Probando rutas protegidas...\n');

  // Test 1: Obtener perfil de usuario
  const profile = await makeRequest('GET', '/auth/me', null, token);
  printResult('Obtener Perfil', profile.success, `Status: ${profile.status}`);

  // Test 2: Obtener ordenes del usuario
  const userOrders = await makeRequest('GET', '/orders/my-orders', null, token);
  printResult('Ordenes del Usuario', userOrders.success, `Status: ${userOrders.status}`);

  // Test 3: Obtener reseñas del usuario
  const userReviews = await makeRequest('GET', '/reviews/user/me', null, token);
  printResult('Reseñas del Usuario', userReviews.success, `Status: ${userReviews.status}`);
};

// Tests de rutas de administracion
const testAdminRoutes = async (token) => {
  if (!token) {
    console.log('\n⚠️  No se pudo obtener token, saltando rutas de administracion...\n');
    return;
  }

  console.log('\n👨‍💼 Probando rutas de administracion...\n');

  // Test 1: Crear producto (requiere rol admin)
  const productData = {
    name: 'Producto de Prueba',
    description: 'Descripcion del producto de prueba',
    price: 99.99,
    sku: 'TEST-001',
    categoryId: 1
  };

  const createProduct = await makeRequest('POST', '/products', productData, token);
  printResult('Crear Producto (Admin)', createProduct.success, `Status: ${createProduct.status}`);

  // Test 2: Crear categoria (requiere rol admin)
  const categoryData = {
    name: 'Categoria de Prueba',
    description: 'Descripcion de la categoria de prueba',
    slug: 'categoria-prueba'
  };

  const createCategory = await makeRequest('POST', '/categories', categoryData, token);
  printResult('Crear Categoria (Admin)', createCategory.success, `Status: ${createCategory.status}`);
};

// Funcion principal
const runTests = async () => {
  console.log(`${colors.blue}🧪 INICIANDO PRUEBAS DE LA API${colors.reset}`);
  console.log(`${colors.blue}URL Base: ${BASE_URL}${colors.reset}\n`);

  try {
    // Probar rutas publicas
    await testPublicRoutes();

    // Probar autenticacion
    const token = await testAuthRoutes();

    // Probar rutas protegidas
    await testProtectedRoutes(token);

    // Probar rutas de administracion
    await testAdminRoutes(token);

    console.log(`\n${colors.green}🎉 PRUEBAS COMPLETADAS${colors.reset}`);
    console.log(`${colors.yellow}Nota: Algunos tests pueden fallar si la base de datos esta vacia o si no hay usuarios admin${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error durante las pruebas:${colors.reset}`, error.message);
  }
};

// Ejecutar pruebas
runTests();
