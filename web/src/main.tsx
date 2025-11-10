import { StrictMode } from 'react';
import ReactDOM from "react-dom/client";
import { QueryProvider } from "~/app/Query";
import App from '~/App.tsx'
import '~/index.css'
import { AppProvider } from '~/app/AppContext';
import '~/shared/lib/i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </QueryProvider>
  </StrictMode>
)
