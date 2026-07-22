import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@vaultguard/design-tokens/css'
import { seedSuperAdmin } from './lib/db/services/seedSuperAdmin'
import { cleanupDuplicateUsers } from './lib/db/services/cleanupDuplicates'

// Ensure DB is seeded on boot
cleanupDuplicateUsers().then(() => seedSuperAdmin()).catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
