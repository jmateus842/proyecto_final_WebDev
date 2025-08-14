const express = require('express');
const ProductController = require('./src/controllers/ProductController');

const app = express();
app.use(express.json());

// Ruta simple para probar
app.get('/test/products', ProductController.getAllProducts);

// Middleware de manejo de errores simple
app.use((error, req, res, next) => {
    console.error('Error en servidor:', error);
    res.status(500).json({ error: error.message });
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Servidor de prueba en puerto ${PORT}`);
    console.log('Prueba: http://localhost:3002/test/products');
});
