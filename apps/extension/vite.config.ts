import { defineConfig, build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// ─── Manifest generation plugin ────────────────────────────────────────────
function generateManifest(mode: string) {
  return {
    name: 'generate-manifest',
    generateBundle() {
      const baseManifest = {
        manifest_version: 3,
        name: 'VaultGuard Password Manager',
        version: '1.0.0',
        description: 'Secure, zero-knowledge password manager',
        permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'tabs'],
        host_permissions: [
          'https://*.supabase.co/*',
          'https://*.supabase.in/*',
          'http://localhost/*',
          'http://127.0.0.1/*',
        ],
        action: {
          default_popup: 'popup.html',
        },
        options_ui: {
          page: 'options.html',
          open_in_tab: true,
        },
        background: {
          service_worker: 'background.js',
        },
        externally_connectable: {
          matches: ['*://localhost:*/*', '*://127.0.0.1:*/*']
        },
        content_scripts: [
          {
            matches: ['<all_urls>', 'http://localhost/*', 'http://127.0.0.1/*'],
            js: ['content.js'],
          },
        ],
      };

      // Safari-specific overrides can be added here when needed
      if (mode === 'safari') {
        // e.g. safari-specific key overrides
      }

      (this as any).emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(baseManifest, null, 2),
      });
    },
  };
}

// ─── Build the worker/content scripts as standalone IIFE bundles ────────────
async function buildScripts(outDir: string) {
  const scripts = [
    { name: 'background', entry: 'src/background/index.ts' },
    { name: 'content',    entry: 'src/content/index.ts'    },
  ];

    for (const { name, entry } of scripts) {
      await viteBuild({
        configFile: false,
        envDir: resolve(__dirname, '../../'),
        define: { 'process.env.NODE_ENV': '"production"' },
      build: {
        outDir,
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, entry),
          name,
          fileName: () => `${name}.js`,
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            // Inline all imports so the output has zero top-level imports
            inlineDynamicImports: true,
          },
        },
      },
    });
  }
}

// ─── Vite plugin that triggers the script build after the main build ────────
function buildExtensionScripts(outDir: string, mode: string) {
  return {
    name: 'build-extension-scripts',
    // closeBundle runs after the main Rollup build finishes
    async closeBundle() {
      await buildScripts(outDir);
    },
  };
}

// ─── Main config (UI pages only) ───────────────────────────────────────────
export default defineConfig(({ mode }) => {
  const outDir = `dist/${mode}`;

  return {
    envDir: resolve(__dirname, '../../'),
    plugins: [
      react(),
      generateManifest(mode),
      buildExtensionScripts(outDir, mode),
    ],
    resolve: {
      alias: {
        '@vaultguard/ui': resolve(__dirname, '../../packages/ui/src/index.ts')
      }
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup:   resolve(__dirname, 'popup.html'),
          options: resolve(__dirname, 'options.html'),
          vault:   resolve(__dirname, 'vault.html'),
          unlock:  resolve(__dirname, 'unlock.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  };
});
