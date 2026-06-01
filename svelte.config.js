import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csrf: {
      // Allow all origins behind Nginx reverse proxy.
      // The app is accessed through the same origin (Nginx serves static + proxies API),
      // so there is no real CSRF risk from external origins.
      trustedOrigins: ["*"],
    },
  },
};

export default config;