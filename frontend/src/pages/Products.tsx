import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent,
  CardMedia,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import productService from '../services/productService';
import categoryService from '../services/categoryService';

const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [user, setUser] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        productService.getProducts(),
        categoryService.getCategories()
      ]);
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category_id = selectedCategory;
      
      const response = await productService.getProducts(params);
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error buscando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Container>
        <Typography>Cargando productos...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Productos
          </Typography>
          
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          
          <Button color="inherit" onClick={() => navigate('/categories')}>
            Categorias
          </Button>
          
          {authService.isAdmin() && (
            <Button color="inherit" onClick={() => navigate('/admin')}>
              Admin
            </Button>
          )}
          
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleMenuOpen}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.first_name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItemComponent onClick={() => navigate('/profile')}>
              Perfil
            </MenuItemComponent>
            <MenuItemComponent onClick={handleLogout}>
              Cerrar Sesion
            </MenuItemComponent>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Catalogo de Productos
        </Typography>

        {/* Filtros */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Buscar productos"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={selectedCategory}
              label="Categoria"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="">Todas las categorias</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button variant="contained" onClick={handleSearch}>
            Buscar
          </Button>
          
          <Button variant="outlined" onClick={() => {
            setSearchTerm('');
            setSelectedCategory('');
            loadData();
          }}>
            Limpiar
          </Button>
        </Box>

        {/* Lista de Productos */}
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="200"
                  image={product.image_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}
                  alt={product.name}
                />
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {product.description}
                  </Typography>
                  <Typography variant="h6" color="primary" gutterBottom>
                    ${product.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SKU: {product.sku}
                  </Typography>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    sx={{ mt: 2 }}
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {products.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No se encontraron productos
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Products;
