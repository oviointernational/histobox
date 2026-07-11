import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success('Password reset link sent to your email.');
      }
    } catch {
      toast.error('Failed to send reset link.');
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
          <p className="text-muted-foreground mt-2">Reset your password</p>
        </div>

        <div className="bg-card rounded-lg p-8 shadow-card border border-border">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to reset your password.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-display font-semibold mb-2">Forgot Password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>

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
                      onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button onClick={handleReset} className="w-full" disabled={loading || !email.trim()}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Reset Link
                </Button>
              </div>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
