import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardPage from './components/Dashboard';
import OperationsPage from './components/OperationsPage';
import OperationsManagePage from './components/OperationsManagePage';
import DashboardLayout from './components/layouts/DashboardLayout';
import AssetsManagePage from './components/AssetsManagePage';

/**
 * App component defines the top‑level router for the application.
 *
 * We expose nested routes under the ``/operations`` path so that the
 * navigation sidebar can group everything related to operations together.
 *
 *  - ``/operations/new`` renders the form to create a new operation.
 *  - ``/operations/manage`` renders the management page where existing
 *    operations can be viewed, edited or duplicated.
 *
 * The base path ``/operations`` simply redirects to ``/operations/new``.
 */
export default function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          {/* Operations group */}
          <Route path="/operations">
            {/* Redirect to /operations/new for backwards compatibility */}
            <Route index element={<OperationsPage />} />
            <Route path="new" element={<OperationsPage />} />
            <Route path="manage" element={<OperationsManagePage />} />
          </Route>

          {/* Assets management */}
          <Route path="/assets/manage" element={<AssetsManagePage />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
