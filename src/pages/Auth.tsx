import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // =====================================================
  // 🔄 DETECT PASSWORD RECOVERY FROM EMAIL LINK
  // =====================================================
  useEffect(() => {
    // Check URL hash for recovery token (Supabase adds tokens in hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");

    if (type === "recovery") {
      setIsPasswordRecovery(true);
    }

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If there's an active session from recovery link, show password form
      if (session && window.location.hash.includes("type=recovery")) {
        setIsPasswordRecovery(true);
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // 🔐 AUTH HANDLER
  // =====================================================
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ------------------------------------------
      // SIGN UP
      // ------------------------------------------
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account Created",
          description: "Please check your inbox to confirm your email.",
        });
        return;
      }

      // ------------------------------------------
      // SIGN IN
      // ------------------------------------------
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Save session to localStorage for Index.tsx
      localStorage.setItem("prime_user", JSON.stringify(data.user));
      localStorage.setItem("username", data.user.user_metadata?.full_name || data.user.email.split("@")[0]);


      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      navigate("/rooms");
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔑 FORGOT PASSWORD HANDLER
  // =====================================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_SITE_URL}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
      });

      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 🔒 UPDATE PASSWORD HANDLER (called after reset link)
  // =====================================================
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password Updated!",
        description: "You can now sign in with your new password.",
      });

      setIsPasswordRecovery(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-primary">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="PrimeTalker Logo"
              className="w-40 h-auto object-contain cursor-pointer select-none"
            />
          </div>


          <CardTitle className="text-3xl font-bold">
            {isPasswordRecovery
              ? "Set New Password"
              : isForgotPassword
                ? "Reset Password"
                : isSignUp
                  ? "Create Account"
                  : "Welcome Back"}
          </CardTitle>

          <CardDescription>
            {isPasswordRecovery
              ? "Enter your new password below"
              : isForgotPassword
                ? "Enter your email to receive a reset link"
                : isSignUp
                  ? "Start breaking language barriers today"
                  : "Sign in to continue to your meetings"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isPasswordRecovery ? (
            /* Set New Password Form */
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-primary"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : isForgotPassword ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-primary"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <Button
                type="button"
                variant="link"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Back to Sign In
              </Button>
            </form>
          ) : (
            /* Sign In / Sign Up Form */
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Forgot Password Link */}
              {!isSignUp && (
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                  >
                    Forgot password?
                  </Button>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full shadow-primary"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isSignUp
                    ? "Sign Up"
                    : "Sign In"}
              </Button>
            </form>
          )}

          {/* Switch Auth Mode */}
          {!isForgotPassword && (
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
