import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import productService from '../services/productService';
import categoryService from '../services/categoryService';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  if (loading) {
    return (
      <Container>
        <Typography>Cargando...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Mr. Robot Commerce
          </Typography>
          
          <Button color="inherit" onClick={() => navigate('/products')}>
            Productos
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
            <MenuItem onClick={handleProfile}>Perfil</MenuItem>
            <MenuItem onClick={handleLogout}>Cerrar Sesion</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bienvenido, {user?.first_name}!
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Productos Destacados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {products.length} productos disponibles
                </Typography>
                <Button 
                  variant="outlined" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/products')}
                >
                  Ver Productos
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Categorias
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {categories.length} categorias disponibles
                </Typography>
                <Button 
                  variant="outlined" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/categories')}
                >
                  Ver Categorias
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
