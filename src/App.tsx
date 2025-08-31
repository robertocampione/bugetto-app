

import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layouts/DashboardLayout";
import DashboardPage from "./components/Dashboard";
import OperationsPage from "./components/OperationsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
        <Route path="/operations" element={<DashboardLayout><OperationsPage /></DashboardLayout>} />
        {/* Altri percorsi */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
