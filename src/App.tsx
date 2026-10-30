import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  MeetingLayout,
  CalendarPage,
  RoomsPage,
  AccessPage,
} from "./features/meetings/MeetingApp";
import NotFoundPage from "./components/NotFoundPage";
import ForbiddenPage from "./components/ForbiddenPage";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import UsersPage from "./features/users/pages/UsersPage";
import "./lib/adapters/nodeAdapter";
import "./lib/db";
import { VehiclePage } from "./features/vehicles/VehicleApp";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MeetingLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/calendar" replace />} />
                <Route
                  path="dashboard"
                  element={<Navigate to="/calendar" replace />}
                />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="vehicles" element={<VehiclePage />} />
                <Route
                  path="my-bookings"
                  element={<CalendarPage key="mine" view="mine" />}
                />
                <Route
                  path="bookings"
                  element={<CalendarPage key="manage" view="manage" />}
                />
                <Route
                  path="rooms"
                  element={
                    <ProtectedRoute requireAdmin>
                      <RoomsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="access"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AccessPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="403" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
