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
import NotFound from "~/pages/NotFound";
import ProtectedRoute from "~/routes/ProtectedRoute";
import Register from "~/pages/Register";
import { useAppContext } from "~/shared/context/AppContext";
import { useEffect, useRef } from "react";
import { fetchMe } from "~/shared/api/authentication";
import { hasToken } from "~/shared/lib/helpers";

export default function App() {
  const { setUser } = useAppContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Only fetch user data if we have a token
    if (hasToken()) {
      fetchMe()
        .then(user => setUser(user))
        .catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [setUser]);

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
            <Route path="expenses" element={<Expenses />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

