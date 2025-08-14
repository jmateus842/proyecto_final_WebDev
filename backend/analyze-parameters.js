const ProductService = require('./src/services/ProductService');
const CategoryService = require('./src/services/CategoryService');

async function analyzeParameters() {
    console.log('🔍 ANALIZANDO PARÁMETROS QUE PODRÍAN CAUSAR ERRORES 500\n');

    // 1. Analizar ProductService.listProducts
    console.log('📋 PRODUCTSERVICE.LISTPRODUCTS - Parámetros esperados:');
    console.log('- page: number (default: 1)');
    console.log('- limit: number (default: 10)');
    console.log('- search: string (default: "")');
    console.log('- categoryId: number | null (default: null)');
    console.log('- minPrice: number | null (default: null)');
    console.log('- maxPrice: number | null (default: null)');
    console.log('- is_active: boolean (default: true)');
    console.log('- sortBy: string (default: "created_at")');
    console.log('- sortOrder: string (default: "DESC")');
    console.log('- includeCategory: boolean (default: true)');
    console.log('- includeInventory: boolean (default: true)\n');

    // 2. Analizar ProductController.getAllProducts
    console.log('📋 PRODUCTCONTROLLER.GETALLPRODUCTS - Parámetros recibidos:');
    console.log('- page: string (from query)');
    console.log('- limit: string (from query)');
    console.log('- search: string (from query)');
    console.log('- category_id: string (from query)');
    console.log('- min_price: string (from query)');
    console.log('- max_price: string (from query)');
    console.log('- in_stock: string (from query)');
    console.log('- sort_by: string (from query)');
    console.log('- sort_order: string (from query)\n');

    // 3. Analizar CategoryService.getAllCategories
    console.log('📋 CATEGORYSERVICE.GETALLCATEGORIES - Parámetros esperados:');
    console.log('- activeOnly: boolean (default: false)\n');

    // 4. Analizar CategoryController.getAllCategories
    console.log('📋 CATEGORYCONTROLLER.GETALLCATEGORIES - Parámetros recibidos:');
    console.log('- active_only: string (from query)\n');

    // 5. Probar diferentes combinaciones de parámetros
    console.log('🧪 PROBANDO DIFERENTES COMBINACIONES DE PARÁMETROS:\n');

    const testCases = [
        { name: 'Caso 1: Sin parámetros', options: {} },
        { name: 'Caso 2: Solo paginación', options: { page: 1, limit: 10 } },
        { name: 'Caso 3: Con búsqueda', options: { search: 'laptop' } },
        { name: 'Caso 4: Con categoría', options: { categoryId: 1 } },
        { name: 'Caso 5: Con filtros de precio', options: { minPrice: 100, maxPrice: 1000 } },
        { name: 'Caso 6: Parámetros inválidos', options: { page: 'invalid', limit: 'invalid' } },
        { name: 'Caso 7: Parámetros extremos', options: { page: -1, limit: 0 } }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`\n🔍 ${testCase.name}:`);
            console.log('Parámetros:', testCase.options);
            
            const result = await ProductService.listProducts(testCase.options);
            console.log('✅ Éxito - Productos encontrados:', result.products.length);
            
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }

    // 6. Probar CategoryService
    console.log('\n🧪 PROBANDO CATEGORYSERVICE:\n');

    try {
        console.log('🔍 Probando getAllCategories sin parámetros:');
        const categories = await CategoryService.getAllCategories();
        console.log('✅ Éxito - Categorías encontradas:', categories.length);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    try {
        console.log('\n🔍 Probando getAllCategories con activeOnly=true:');
        const activeCategories = await CategoryService.getAllCategories({ activeOnly: true });
        console.log('✅ Éxito - Categorías activas encontradas:', activeCategories.length);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

analyzeParameters().catch(console.error);
