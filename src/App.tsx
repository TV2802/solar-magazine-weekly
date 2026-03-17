import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SavedDrawer } from "@/components/SavedDrawer";
import { ArticleDrawer } from "@/components/ArticleDrawer";
import Index from "./pages/Index";
import MarketIntelligence from "./pages/MarketIntelligence";
import CAHub from "./pages/market/CA";
import NotFound from "./pages/NotFound";
import type { Article } from "@/hooks/useArticles";

const queryClient = new QueryClient();

const AppContent = () => {
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedArticle, setSavedArticle] = useState<Article | null>(null);

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <SiteNav onOpenSaved={() => setSavedOpen(true)} />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/market" element={<MarketIntelligence />} />
            <Route path="/market/CA" element={<CAHub />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>

      <SavedDrawer
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        onSelectArticle={(a) => setSavedArticle(a)}
      />
      <ArticleDrawer
        article={savedArticle}
        open={!!savedArticle}
        onClose={() => setSavedArticle(null)}
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
