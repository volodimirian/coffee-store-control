import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "~/layouts/Layout";
import Home from "~/pages/Home";
import Login from "~/pages/Login";
import Dashboard from "~/pages/Dashboard";
import Account from "~/pages/Account";
import Products from "~/pages/Products";
import Orders from "~/pages/Orders";
import Analytics from "~/pages/Analytics";
import Settings from "~/pages/Settings";
import Locations from "~/pages/Locations";
import Expenses from "~/pages/Expenses";
import Overview from "~/pages/expenses/Overview";
import InventoryTracking from "~/pages/expenses/InventoryTracking";
import Categories from "~/pages/expenses/Categories";
import Reports from "~/pages/expenses/Reports";
import NotFound from "~/pages/NotFound";
import ProtectedRoute from "~/routes/ProtectedRoute";
import Register from "~/pages/Register";
import { useAppContext } from "~/shared/context/AppContext";
import { useEffect, useRef } from "react";
import { fetchMe } from "~/shared/api/authentication";
import { hasToken } from "~/shared/lib/helpers";

export default function App() {
  const { setUser, setIsInitialized } = useAppContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Only fetch user data if we have a token
    if (hasToken()) {
      fetchMe()
        .then(user => {
          setUser(user);
          setIsInitialized(true);
        })
        .catch(() => {
          setUser(null);
          setIsInitialized(true);
        });
    } else {
      setUser(null);
      setIsInitialized(true);
    }
  }, [setUser, setIsInitialized]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="account" element={<Account />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="locations" element={<Locations />} />
            
            {/* Expenses with nested routes */}
            <Route path="expenses" element={<Expenses />}>
              <Route index element={<Overview />} />
              <Route path="inventory-tracking" element={<InventoryTracking />} />
              <Route path="categories" element={<Categories />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

