import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper, 
  Alert,
  Link,
  Grid 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName
      };

      await authService.register(userData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Registro
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="firstName"
                  label="Nombre"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="lastName"
                  label="Apellido"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="username"
              label="Nombre de Usuario"
              value={formData.username}
              onChange={handleChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contrasena"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Contrasena"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link href="/login" variant="body2">
                Ya tienes cuenta? Inicia sesion aqui
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
