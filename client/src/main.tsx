import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global unhandled rejection handler
window.addEventListener("unhandledrejection", (event) => {
  // Check if this is a user rejection from MetaMask (expected behavior)
  const isUserRejection = 
    event.reason?.code === 4001 || 
    event.reason?.message?.includes("User rejected") ||
    event.reason?.message?.includes("user rejected");
  
  if (isUserRejection) {
    // User rejected the transaction - this is normal, just log it
    console.log("User cancelled the transaction");
    event.preventDefault(); // Prevent error overlay for user rejections
    return;
  }
  
  // For other errors, log and prevent overlay
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
