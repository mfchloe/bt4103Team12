import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/auth/RequireAuth.jsx";

import Home from "./pages/Home";
import TimeSeries from "./pages/TimeSeries";
import FARDashboard from "./pages/FARDashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login.jsx";
import Transactions from "./pages/Transactions.jsx";
import Profile from "./pages/Profile.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <RequireAuth>
                {" "}
                <Home />{" "}
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                {" "}
                <Transactions />{" "}
              </RequireAuth>
            }
          />
          <Route path="/timeseries" element={<TimeSeries />} />
          <Route path="/far-dashboard" element={<FARDashboard />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
