import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import ComparePage from "./pages/ComparePage";
import GalleryPage from "./pages/GalleryPage";
import AboutPage from "./pages/AboutPage";

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/producto/:id" element={<ProductPage />} />
      <Route path="/comparar/:id" element={<ComparePage />} />
      <Route path="/galeria" element={<GalleryPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
