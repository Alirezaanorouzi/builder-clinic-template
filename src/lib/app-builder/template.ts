export type TemplateFile = {
  path: string
  content: string
}

export const generatedAppFiles: TemplateFile[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "generated-app",
        private: true,
        version: "0.0.0",
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          "@cursor/sdk": "1.4.2",
          next: "16.2.4",
          react: "19.2.4",
          "react-dom": "19.2.4",
        },
        devDependencies: {
          "@types/node": "^20",
          "@types/react": "^19",
          "@types/react-dom": "^19",
          typescript: "^5",
        },
      },
      null,
      2
    ),
  },
  {
    path: "next.config.ts",
    content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ),
  },
  {
    path: "next-env.d.ts",
    content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`,
  },
  {
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generated App",
  description: "Built with the app builder preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  },
  {
    path: "app/page.tsx",
    content: `export default function Home() {
  return (
    <main className="boilerplate">
      <p>This is your boilerplate. Start making changes by prompting the agent.</p>
    </main>
  );
}
`,
  },
  {
    path: "app/globals.css",
    content: `* {
  box-sizing: border-box;
}

:root {
  color: #171717;
  background: #ffffff;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  font-family:
    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.boilerplate {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  text-align: center;
}

.boilerplate p {
  max-width: 420px;
  margin: 0;
  color: #666666;
  font-size: 16px;
  line-height: 1.6;
}
`,
  },
]