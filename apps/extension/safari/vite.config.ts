import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
const browser='safari';
const outDir=resolve(__dirname,'../dist/safari');
function manifest() {
  const safariManifest = {
    manifest_version: 3,
    name: 'VaultGuard Password Manager for Safari',
    version: '1.0.0',
    description: 'Secure, zero-knowledge password manager',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'tabs'],
    host_permissions: ['https://*.supabase.co/*', 'https://*.supabase.in/*'],
    action: { default_popup: 'popup.html' },
    options_ui: { page: 'options.html', open_in_tab: true },
    background: { service_worker: 'background.js' },
    content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], run_at: 'document_idle' }],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" }
  };
  return { name: 'safari-manifest', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(safariManifest, null, 2) });
  } };
}async function scripts(){ for(const [name,entry] of [['background','src/background/index.ts'],['content','src/content/index.ts']]) { const { build } = await import('vite'); await build({configFile:false,envDir:resolve(__dirname,'../../../'),define:{'process.env.NODE_ENV':'"production"'},build:{outDir,emptyOutDir:false,lib:{entry:resolve(__dirname,entry),name,fileName:()=>name+'.js',formats:['iife']},rollupOptions:{output:{inlineDynamicImports:true}}}}); } }
export default defineConfig({root: __dirname,envDir:resolve(__dirname,'../../../'),plugins:[react(),manifest(),{name:'browser-scripts',async closeBundle(){await scripts();}}],resolve:{alias:{'@vaultguard/ui':resolve(__dirname,'../../../packages/ui/src/index.ts')}},build:{outDir,emptyOutDir:true,rollupOptions:{input:{popup:resolve(__dirname,'popup.html'),options:resolve(__dirname,'options.html'),vault:resolve(__dirname,'vault.html'),unlock:resolve(__dirname,'unlock.html')},output:{entryFileNames:'[name].js',chunkFileNames:'assets/[name].js',assetFileNames:'assets/[name].[ext]'}}}});