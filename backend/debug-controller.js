const ProductController = require('./src/controllers/ProductController');

// Simular request y response
const mockReq = {
    query: {
        page: '1',
        limit: '10'
    }
};

const mockRes = {
    status: function(code) {
        console.log('Status:', code);
        return this;
    },
    json: function(data) {
        console.log('Response:', JSON.stringify(data, null, 2));
        return this;
    }
};

async function debugController() {
    try {
        console.log('🔍 Probando ProductController.getAllProducts()...');
        await ProductController.getAllProducts(mockReq, mockRes);
    } catch (error) {
        console.error('❌ Error en ProductController:', error);
        console.error('Stack trace:', error.stack);
    }
}

debugController();
