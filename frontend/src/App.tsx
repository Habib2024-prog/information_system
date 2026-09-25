import { BrowserRouter } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "./components/ui/toast";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </ToastProvider>
  );
}
