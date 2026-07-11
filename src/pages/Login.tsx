import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, MessageCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/store/useStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const settings = useStore((s) => s.settings);
  const supportLink = settings.supportLink;
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      useStore.getState().fetchCases();
      await useStore.getState().fetchSystemUsers();

      const normalizedEmail = email.trim().toLowerCase();

      const state = useStore.getState();
      let sysUser = state.systemUsers.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      const fallbackRoleId = state.settings.defaultRoleId;

      // If no profile exists yet, auto-create one with the default role so user is always let in
      if (!sysUser) {
        const newUser = {
          id: data.user?.id || crypto.randomUUID(),
          name: email.trim().split('@')[0],
          gender: 'Male' as const,
          raNumber: '',
          phone: '',
          email: email.trim(),
          office: 'MLS' as const,
          designation: '',
          roleId: fallbackRoleId,
          isActive: true,
          password: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.addSystemUser(newUser);
        sysUser = newUser;
      }

      useStore.getState().login({
        id: sysUser.id,
        name: sysUser.name,
        phone: sysUser.phone,
        role: sysUser.roleId,
        raNumber: sysUser.raNumber,
      });

      navigate('/');
      toast.success(`Welcome, ${sysUser.name}`);
    } catch (err: any) {
      toast.error('Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary tracking-tight">HISTOBOX</h1>
          <p className="text-muted-foreground mt-2">Laboratory Management System</p>
        </div>

        <div className="bg-card rounded-lg p-8 shadow-card border border-border">
          <h2 className="text-xl font-display font-semibold mb-2">Sign In</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your email and password to continue.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button onClick={handleLogin} className="w-full" disabled={loading || !email.trim() || !password.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {supportLink ? (
              <a href={supportLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> Contact Support
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Contact admin for help.</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
