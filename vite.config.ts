import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://rrbyseeqiwbvazoazoot.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyYnlzZWVxaXdidmF6b2F6b290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ1MjcsImV4cCI6MjA4MjQzMDUyN30.Y_k4Y6Vjw8xqwrfxPMBdviWOAv8RZjV5EabVHAKPuuY'),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('rrbyseeqiwbvazoazoot'),
  },
}));
