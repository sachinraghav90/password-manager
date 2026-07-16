import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, Key, Smartphone } from 'lucide-react';

export function Welcome() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span className="font-bold text-xl tracking-tight">VaultGuard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">Log in</Link>
            <Link to="/register" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">Get Started</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24 flex flex-col items-center text-center">
        <Badge variant="secondary" className="mb-6">Enterprise-grade security for teams</Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl text-balance">
          The credential workspace for technical teams
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-12">
          Securely store passwords, passkeys, and developer secrets with true end-to-end encryption. Built for speed, collaboration, and peace of mind.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <Link to="/register" className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 h-11 px-8 text-lg">
            Start your free trial <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 text-lg">
            Sign in
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left max-w-5xl w-full">
          <div className="p-6 bg-card rounded-2xl border shadow-sm">
            <Lock className="w-10 h-10 text-blue-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Zero-Knowledge Architecture</h3>
            <p className="text-muted-foreground">Your data is encrypted locally. We cannot see, read, or access your secrets.</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border shadow-sm">
            <Key className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Developer Secrets</h3>
            <p className="text-muted-foreground">Store SSH keys, environment variables, and API tokens alongside your passwords.</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border shadow-sm">
            <Smartphone className="w-10 h-10 text-purple-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Cross-Platform Sync</h3>
            <p className="text-muted-foreground">Access your vault on desktop, mobile, and browser extensions seamlessly.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Inline badge for Welcome page since we can't import easily if it's deeply nested
function Badge({ children, variant = "default", className = "" }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
      variant === 'secondary' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
    } ${className}`}>
      {children}
    </span>
  )
}
