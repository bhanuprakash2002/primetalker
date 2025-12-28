import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Video, Globe, Mic, Shield, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  // Small avatar icon (opens drawer)
  const ProfileMenu = ({ user }: { user: any }) => {
    return (
      <img
        src={user.user_metadata?.avatar_url || "/default-avatar.svg"}
        className="w-10 h-10 rounded-full border cursor-pointer hover:scale-105 transition"
        onClick={() => setDrawerOpen(true)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero">

      {/* NAVIGATION BAR */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">

          {/* LEFT - LOGO */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/landing")}
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-40 h-auto object-contain select-none"
            />
          </div>

          {/* RIGHT - PROFILE / BUTTONS */}
          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="shadow-primary">
                Get Started
              </Button>
            </div>
          )}

        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="container mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Break Language Barriers in
            <span className="text-transparent bg-clip-text bg-gradient-primary">
              {" "}Real-Time
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with anyone, anywhere. PrimeTalker provides instant translation
            during calls, making global communication seamless.
          </p>

          {/* START MEETING BUTTON */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => (user ? navigate("/rooms") : navigate("/auth"))}
              className="shadow-primary text-lg px-8"
            >
              Start Meeting
            </Button>
            <a
              href="/PrimeTalker-User-Guide.html"
              download="PrimeTalker-User-Guide.html"
              className="inline-flex"
            >
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 gap-2"
              >
                <Download className="w-5 h-5" />
                Download Guide
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Video className="w-8 h-8" />}
            title="HD Voice Calls"
            description="Crystal clear quality powered by Twilio Voice SDK."
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8" />}
            title="Real-Time Translation"
            description="Instant translation in 100+ languages."
          />
          <FeatureCard
            icon={<Mic className="w-8 h-8" />}
            title="Voice Recognition"
            description="Advanced STT using Deepgram/Google Cloud."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Secure Platform"
            description="Encrypted communication for safe meetings."
          />
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-card rounded-2xl p-12 text-center shadow-primary border border-border">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Connect Globally?
          </h3>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users breaking language barriers every day.
          </p>

          {/* CTA BUTTON - SAME BEHAVIOR AS START MEETING */}
          <Button
            size="lg"
            onClick={() => (user ? navigate("/rooms") : navigate("/auth"))}
            className="shadow-primary text-lg px-8"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <div
              onClick={() => navigate("/landing")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="font-semibold text-foreground">PrimeTalker</span>
            </div>

            <p className="text-muted-foreground text-sm">
              © 2025 PrimeTalker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* PROFILE DRAWER */}
      {user && (
        <ProfileDrawer
          user={user}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
};

/* FEATURE CARD */
const FeatureCard = ({ icon, title, description }: any) => (
  <div className="bg-card rounded-xl p-6 border border-border hover:shadow-primary transition-all duration-300 hover:-translate-y-1">
    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
      {icon}
    </div>
    <h4 className="text-xl font-semibold text-foreground mb-2">{title}</h4>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

/* PREMIUM PROFILE DRAWER */
const ProfileDrawer = ({ user, open, onClose }: any) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(
    user.user_metadata?.full_name || user.user_metadata?.username || user.email.split("@")[0]
  );
  const [avatarPreview, setAvatarPreview] = useState(
    user.user_metadata?.avatar_url || "/default-avatar.svg"
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("prime_user");
    localStorage.removeItem("username");
    window.location.href = "/landing";
  };

  /* Handle Avatar Upload */
  const handleAvatarChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* Save Profile Changes */
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      let uploadedAvatarUrl = user.user_metadata?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          if (uploadError.message.includes("bucket") || uploadError.message.includes("not found")) {
            throw new Error("Storage bucket not configured. Please create 'avatars' bucket in Supabase.");
          }
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        uploadedAvatarUrl = publicUrlData.publicUrl;
      }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          avatar_url: uploadedAvatarUrl,
        },
      });

      if (error) throw error;

      // Update local storage
      localStorage.setItem("username", name);

      // Reset editing state and refresh
      setEditing(false);
      setAvatarFile(null);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(user.user_metadata?.avatar_url || "/default-avatar.svg");
    setName(user.user_metadata?.full_name || user.user_metadata?.username || user.email.split("@")[0]);
    setError(null);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 
          shadow-2xl z-50 rounded-l-2xl border-l border-gray-200 dark:border-slate-700
          transform transition-transform duration-300 flex flex-col
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editing ? "Edit Profile" : "My Account"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <span className="text-gray-500 dark:text-gray-400">✕</span>
          </button>
        </div>

        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center text-center border-b border-gray-100 dark:border-slate-800">
          {/* Avatar with edit overlay */}
          <div className="relative group">
            <img
              src={avatarPreview}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg object-cover"
              onError={(e: any) => { e.target.src = "/default-avatar.svg"; }}
            />
            {editing && (
              <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">📷 Change</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>

          {/* Name & Email */}
          {!editing ? (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.user_metadata?.full_name || user.user_metadata?.username || user.email.split("@")[0]}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
            </div>
          ) : (
            <div className="mt-4 w-full">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 text-left">
                Display Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your name"
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Menu Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          {!editing ? (
            <div className="space-y-2">
              {/* Edit Profile */}
              <button
                className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left"
                onClick={() => setEditing(true)}
              >
                <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-lg">✏️</span>
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Edit Profile</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Change name and avatar</p>
                </div>
              </button>

              {/* My Rooms - Navigate to rooms page */}
              <button
                className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left"
                onClick={() => { onClose(); navigate("/rooms"); }}
              >
                <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-lg">🎥</span>
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">My Rooms</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create or join meetings</p>
                </div>
              </button>

              {/* Settings - Coming Soon */}
              <button
                className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-xl opacity-60 cursor-not-allowed text-left"
                disabled
              >
                <span className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Settings</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Coming soon</p>
                </div>
              </button>

              {/* Help/Guide */}
              <a
                href="/PrimeTalker-User-Guide.html"
                target="_blank"
                className="w-full p-3 flex items-center gap-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left block"
              >
                <span className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <span className="text-lg">📖</span>
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">User Guide</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Learn how to use PrimeTalker</p>
                </div>
              </a>
            </div>
          ) : (
            /* Edit Mode Buttons */
            <div className="space-y-3 mt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save Changes
                  </>
                )}
              </button>

              <button
                onClick={cancelEditing}
                disabled={saving}
                className="w-full p-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Sign Out - Fixed at bottom */}
        {!editing && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={logout}
              className="w-full p-3 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors"
            >
              <span>🚪</span>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  );
};


export default Landing;
