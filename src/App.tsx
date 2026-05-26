import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router/AppRouter';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/Toaster';

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
