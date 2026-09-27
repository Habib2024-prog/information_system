import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui/toast";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
