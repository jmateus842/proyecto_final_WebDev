import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import authService from './services/authService';

// Crear tema oscuro
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff00', // Verde cyberpunk
    },
    secondary: {
      main: '#ff00ff', // Magenta cyberpunk
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Rutas publicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta por defecto */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
