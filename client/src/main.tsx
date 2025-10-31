import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global unhandled rejection handler - must be added early to catch all rejections
window.addEventListener("unhandledrejection", (event) => {
  // Handle cases where event.reason might not be an error object
  const reason = event.reason;
  const reasonString = typeof reason === 'string' ? reason : reason?.message || String(reason);
  
  // Check if this is a user rejection from MetaMask (expected behavior)
  const isUserRejection = 
    reason?.code === 4001 || 
    reason?.code === "ACTION_REJECTED" ||
    reasonString?.toLowerCase().includes("user rejected") ||
    reasonString?.toLowerCase().includes("user denied") ||
    reasonString?.toLowerCase().includes("cancelled");
  
  if (isUserRejection) {
    // User rejected the transaction - this is normal, just log it
    console.log("User cancelled the transaction");
    event.preventDefault(); // Prevent error overlay for user rejections
    event.stopPropagation(); // Stop the event from bubbling
    event.stopImmediatePropagation(); // Prevent other listeners from firing
    return;
  }
  
  // For other errors, log them but still prevent the overlay
  if (reason) {
    console.error("Unhandled promise rejection:", reason);
  }
  event.preventDefault();
  event.stopPropagation();
}, true); // Use capture phase to run before other listeners

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
