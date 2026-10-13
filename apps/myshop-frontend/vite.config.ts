import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const port = Number(process.env.MYSHOP_BACKEND_PORT);
  if (
    command === "serve" &&
    (!Number.isInteger(port) || port < 1 || port > 65535)
  )
    throw new Error("Start MyShop through Zap to allocate its backend port.");
  const proxy =
    Number.isInteger(port) && port > 0
      ? {
          "/api/files": {
            target: `http://127.0.0.1:${port}`,
            changeOrigin: true,
          },
        }
      : undefined;
  return {
    plugins: [react()],
    server: { host: "127.0.0.1", proxy },
    preview: { host: "127.0.0.1", proxy },
  };
});
