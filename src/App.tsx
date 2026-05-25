import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Expenses from './pages/Expenses';
import Trash from './pages/Trash';
import Inventory from './pages/Inventory';
import Workers from './pages/Workers';
import ProfitSummary from './pages/ProfitSummary';
import Yearly from './pages/Yearly';
import Settings from './pages/Settings';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }} />
        <ErrorBoundary>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/products" element={<Products />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/profit-summary" element={<ProfitSummary />} />
              <Route path="/yearly" element={<Yearly />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}
