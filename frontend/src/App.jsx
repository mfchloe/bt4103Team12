import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

// actual pages
import Home from "./pages/Home";
import TimeSeries from "./pages/TimeSeries";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timeseries" element={<TimeSeries />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
