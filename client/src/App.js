import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

// Context
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// Components
import PrivateRoute from './components/routing/PrivateRoute';
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Items from './pages/items/Items';
import ItemDetail from './pages/items/ItemDetail';
import CreateItem from './pages/items/CreateItem';
import EditItem from './pages/items/EditItem';
import Locations from './pages/locations/Locations';
import LocationDetail from './pages/locations/LocationDetail';
import CreateLocation from './pages/locations/CreateLocation';
import EditLocation from './pages/locations/EditLocation';
import Labels from './pages/labels/Labels';
import CreateLabel from './pages/labels/CreateLabel';
import EditLabel from './pages/labels/EditLabel';
import Categories from './pages/categories/Categories';
import CreateCategory from './pages/categories/CreateCategory';
import EditCategory from './pages/categories/EditCategory';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';
import Reports from './pages/reports/Reports';
import QRGenerator from './pages/tools/QRGenerator';
import LabelGenerator from './pages/tools/LabelGenerator';
import ImportExport from './pages/tools/ImportExport';
import Subscription from './pages/subscription/Subscription';
import Achievements from './pages/achievements/Achievements';
import Reminders from './pages/reminders/Reminders';
import ReminderDetail from './pages/reminders/ReminderDetail';
import CreateReminder from './pages/reminders/CreateReminder';
import EditReminder from './pages/reminders/EditReminder';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateUser from './pages/admin/CreateUser';
import EditUser from './pages/admin/EditUser';

// Create theme with light purple primary color
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#6B46C1', // Light purple
      light: '#9F7AEA',
      dark: '#553C9A',
      contrastText: '#fff',
    },
    secondary: {
      main: '#38B2AC', // Teal
      light: '#4FD1C5',
      dark: '#2C7A7B',
      contrastText: '#fff',
    },
    background: {
      default: mode === 'light' ? '#f7fafc' : '#1a202c',
      paper: mode === 'light' ? '#fff' : '#2d3748',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.18)',
        },
      },
    },
  },
});

const App = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(() => {
    // Get theme preference from localStorage or default to 'light'
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  const theme = React.useMemo(() => getTheme(mode), [mode]);

  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  useEffect(() => {
    // Simulate loading app resources
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AlertProvider>
        <AuthProvider>
          <Router>
            <Navbar toggleColorMode={toggleColorMode} mode={mode} />
            <Alert />
            <Layout>
              <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              
              {/* Items */}
              <Route path="/items" element={<PrivateRoute><Items /></PrivateRoute>} />
              <Route path="/items/create" element={<PrivateRoute><CreateItem /></PrivateRoute>} />
              <Route path="/items/edit/:id" element={<PrivateRoute><EditItem /></PrivateRoute>} />
              <Route path="/items/:id" element={<PrivateRoute><ItemDetail /></PrivateRoute>} />
              
              {/* Locations */}
              <Route path="/locations" element={<PrivateRoute><Locations /></PrivateRoute>} />
              <Route path="/locations/create" element={<PrivateRoute><CreateLocation /></PrivateRoute>} />
              <Route path="/locations/edit/:id" element={<PrivateRoute><EditLocation /></PrivateRoute>} />
              <Route path="/locations/:id" element={<PrivateRoute><LocationDetail /></PrivateRoute>} />
              
              {/* Labels */}
              <Route path="/labels" element={<PrivateRoute><Labels /></PrivateRoute>} />
              <Route path="/labels/create" element={<PrivateRoute><CreateLabel /></PrivateRoute>} />
              <Route path="/labels/edit/:id" element={<PrivateRoute><EditLabel /></PrivateRoute>} />
              
              {/* Categories */}
              <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
              <Route path="/categories/create" element={<PrivateRoute><CreateCategory /></PrivateRoute>} />
              <Route path="/categories/edit/:id" element={<PrivateRoute><EditCategory /></PrivateRoute>} />
              
              {/* Tools */}
              <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="/tools/qr-generator" element={<PrivateRoute><QRGenerator /></PrivateRoute>} />
              <Route path="/tools/label-generator" element={<PrivateRoute><LabelGenerator /></PrivateRoute>} />
              <Route path="/tools/import-export" element={<PrivateRoute><ImportExport /></PrivateRoute>} />
              
              {/* User */}
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />
              <Route path="/achievements" element={<PrivateRoute><Achievements /></PrivateRoute>} />
              
              {/* Reminders */}
              <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
              <Route path="/reminders/create" element={<PrivateRoute><CreateReminder /></PrivateRoute>} />
              <Route path="/reminders/edit/:id" element={<PrivateRoute><EditReminder /></PrivateRoute>} />
              <Route path="/reminders/:id" element={<PrivateRoute><ReminderDetail /></PrivateRoute>} />
              
              {/* Admin */}
              <Route path="/admin/dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/users/create" element={<PrivateRoute><CreateUser /></PrivateRoute>} />
              <Route path="/admin/users/edit/:id" element={<PrivateRoute><EditUser /></PrivateRoute>} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </AlertProvider>
    </ThemeProvider>
  );
};

export default App;
