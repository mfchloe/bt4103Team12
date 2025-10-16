import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import TimeSeries from "./pages/TimeSeries";
import FARDashboard from "./pages/FARDashboard";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timeseries" element={<TimeSeries />} />
          <Route path="/far-dashboard" element={<FARDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
