import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 App starting...");
console.log("Env URL:", import.meta.env.VITE_SUPABASE_URL ? "✅ Loaded" : "❌ Missing");
console.log("Env KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "✅ Loaded" : "❌ Missing");

createRoot(document.getElementById("root")!).render(<App />);
