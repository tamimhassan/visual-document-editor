import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...coreWebVitals,
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
  {
    rules: {
      // Image blocks render user-uploaded data URIs and are rasterised by
      // html2canvas on export; next/image adds nothing here.
      "@next/next/no-img-element": "off",
    },
  },
]);
