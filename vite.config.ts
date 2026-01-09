import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite"; // ← 이것도 설치 필요

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← 추가
  ],
});
