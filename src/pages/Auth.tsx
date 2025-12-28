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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countries, getStatesByCountry } from "@/lib/countryStateData";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Get states for selected country
  const availableStates = country ? getStatesByCountry(country) : [];

  // Reset state when country changes
  useEffect(() => {
    setStateProvince("");
  }, [country]);

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
        // Validate confirm password
        if (password !== confirmPassword) {
          toast({
            title: "Passwords Don't Match",
            description: "Please make sure both passwords are the same.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate username
        if (!username.trim()) {
          toast({
            title: "Username Required",
            description: "Please enter a username.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create user in Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/`,
            data: {
              username: username,
              country: country,
              state: stateProvince,
            },
          },
        });

        if (error) throw error;

        // Save profile to Supabase PostgreSQL (if user was created)
        if (data.user) {
          try {
            const countryName = countries.find(c => c.code === country)?.name || country;
            const stateName = availableStates.find(s => s.code === stateProvince)?.name || stateProvince;

            console.log("🔍 Saving profile for user:", data.user.id);
            console.log("📦 Profile data:", { username: username.trim(), country: countryName, state: stateName });

            // Insert directly into Supabase user_profiles table
            const { data: insertData, error: profileError } = await supabase
              .from("user_profiles")
              .insert({
                user_id: data.user.id,
                username: username.trim(),
                country: countryName,
                state: stateName,
              })
              .select();

            if (profileError) {
              console.error("❌ Profile save error:", profileError);
              console.error("Error details:", JSON.stringify(profileError, null, 2));
            } else {
              console.log("✅ Profile saved successfully:", insertData);
            }
          } catch (profileError) {
            console.error("❌ Profile save error (exception):", profileError);
          }
        } else {
          console.log("⚠️ No user returned from signUp");
        }

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
      localStorage.setItem("username", data.user.user_metadata?.username || data.user.user_metadata?.full_name || data.user.email.split("@")[0]);


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
              {/* Username (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
              )}

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

              {/* Country (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* State (Sign Up only, shown when country has states) */}
              {isSignUp && availableStates.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Select value={stateProvince} onValueChange={setStateProvince}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
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
              )}

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
