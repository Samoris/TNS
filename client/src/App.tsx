import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Register from "@/pages/register";
import Manage from "@/pages/manage";
import SendPayment from "@/pages/send-payment";
import Sync from "@/pages/sync";
import Docs from "@/pages/docs";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Support from "@/pages/support";
import AgentTest from "@/pages/AgentTest";
import AgentRegister from "@/pages/AgentRegister";
import Agents from "@/pages/Agents";
import Referrals from "@/pages/referrals";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/search" component={Search} />
          <Route path="/register" component={Register} />
          <Route path="/manage" component={Manage} />
          <Route path="/send-payment" component={SendPayment} />
          <Route path="/sync" component={Sync} />
          <Route path="/docs" component={Docs} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/support" component={Support} />
          <Route path="/agents" component={Agents} />
          <Route path="/agent-test" component={AgentTest} />
          <Route path="/agent-register" component={AgentRegister} />
          <Route path="/referrals" component={Referrals} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    }

    // Capture ?ref=CODE from any landing URL and persist it for the registration flow
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
        localStorage.setItem("tns_referral_code", ref);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
