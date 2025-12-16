import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { MapPage } from "./pages/MapPage";
import "./App.css";
import { SegmentsManagementPage } from "./pages/SegmentsManagementPage";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function App() {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/map" element={<MapPage />} />
            <Route
              path="/segments-management"
              element={<SegmentsManagementPage />}
            />
            <Route path="/" element={<Navigate to="/segments-management" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </APIProvider>
  );
}

export default App;
