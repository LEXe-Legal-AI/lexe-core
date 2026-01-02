import { useState } from 'react';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { loginWithOIDC, isOIDCEnabled } from '@/lib/oidc';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOIDCLoading, setIsOIDCLoading] = useState(false);

  const { login, isLoading } = useAuthStore();
  const oidcEnabled = isOIDCEnabled();

  const handleOIDCLogin = async () => {
    setError(null);
    setIsOIDCLoading(true);
    try {
      await loginWithOIDC('/');
    } catch {
      setError('Errore durante il login SSO. Riprova.');
      setIsOIDCLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    try {
      await login(email, password);
      // Navigation will be handled by the router/auth guard
    } catch {
      setError('Credenziali non valide. Riprova.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {/* LEO Logo */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-10 w-10 text-primary-foreground"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">LEO</CardTitle>
          <CardDescription>
            LLM Enhanced Orchestrator
            <br />
            <span className="text-xs italic">Il tuo Direttore Operativo Virtuale</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@azienda.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Inserisci la password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">
                  Ricordami
                </span>
              </label>
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm"
                disabled={isLoading}
              >
                Password dimenticata?
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || isOIDCLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                'Accedi'
              )}
            </Button>

            {/* SSO Login Button (when OIDC is enabled) */}
            {oidcEnabled && (
              <>
                <div className="relative w-full">
                  <Separator className="my-2" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                    oppure
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || isOIDCLoading}
                  onClick={handleOIDCLogin}
                >
                  {isOIDCLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reindirizzamento...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Accedi con SSO
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Footer Text */}
            <p className="text-center text-xs text-muted-foreground">
              Accedendo, accetti i{' '}
              <Button variant="link" className="h-auto p-0 text-xs">
                Termini di Servizio
              </Button>{' '}
              e la{' '}
              <Button variant="link" className="h-auto p-0 text-xs">
                Privacy Policy
              </Button>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Version Info */}
      <div className="fixed bottom-4 text-center text-xs text-muted-foreground">
        LEO Platform v1.0.0 - Framework ORCHIDEA v1.3
      </div>
    </div>
  );
}

export default Login;
