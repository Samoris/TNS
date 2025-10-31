import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Aggressive early handler to catch unhandled rejections before any plugins
// This runs in capture phase with highest priority
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const reasonString = typeof reason === 'string' ? reason : reason?.message || String(reason);
  
  // Check if this is a user rejection from MetaMask (expected behavior)
  const isUserRejection = 
    reason?.code === 4001 || 
    reason?.code === "ACTION_REJECTED" ||
    reasonString?.toLowerCase().includes("user rejected") ||
    reasonString?.toLowerCase().includes("user denied") ||
    reasonString?.toLowerCase().includes("user cancelled") ||
    reasonString?.toLowerCase().includes("cancelled");
  
  if (isUserRejection) {
    // User rejected the transaction - this is normal, just log it
    console.log("User cancelled the transaction");
    // Aggressively prevent error display
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  
  // For non-user-rejection errors, log them
  console.error("Unhandled promise rejection:", reason);
};

// Add the listener as early as possible in capture phase
window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

// Also add in bubble phase as a backup
window.addEventListener("unhandledrejection", handleUnhandledRejection, false);

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
