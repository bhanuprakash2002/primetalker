import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Video, Globe, Mic, Shield } from "lucide-react";
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
        src={user.user_metadata?.avatar_url || "/default-avatar.png"}
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(
    user.user_metadata?.full_name || user.email.split("@")[0]
  );
  const [avatarPreview, setAvatarPreview] = useState(
    user.user_metadata?.avatar_url || "/default-avatar.png"
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  /* ---------------------------
        Handle Avatar Upload
  ---------------------------- */
  const handleAvatarChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* ---------------------------
       Save Profile Changes
  ---------------------------- */
  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      let uploadedAvatarUrl = user.user_metadata?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        const filePath = `avatars/${user.id}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

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

      // UPDATE LOCAL STORAGE
      localStorage.setItem("username", name);

      // Refresh UI
      window.location.reload();

      // Refresh page to reflect changes
      window.location.reload();
    } catch (err: any) {
      alert("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 
          shadow-2xl z-50 rounded-l-2xl border-l border-gray-200 dark:border-slate-700
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between dark:border-slate-700">
          <h2 className="text-xl font-semibold">My Account</h2>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-black">✕</button>
        </div>

        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center text-center">

          {/* Avatar */}
          <img
            src={avatarPreview}
            className="w-24 h-24 rounded-full border shadow-md object-cover"
          />

          {editing && (
            <label className="mt-3 text-sm cursor-pointer text-blue-500">
              Change Avatar
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          )}

          {/* Name */}
          {!editing ? (
            <>
              <h3 className="mt-4 text-xl font-semibold">
                {user.user_metadata?.full_name || user.email.split("@")[0]}
              </h3>
              <p className="text-gray-500">{user.email}</p>
            </>
          ) : (
            <div className="mt-4 w-full px-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded-md border bg-white dark:bg-slate-800"
                placeholder="Your Name"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 space-y-3 mt-3">

          {!editing && (
            <>
              <button
                className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>

              <button className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left">
                ⚙️ Settings (coming soon)
              </button>

              <button
                onClick={logout}
                className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-left"
              >
                🚪 Sign Out
              </button>
            </>
          )}

          {/* Save / Cancel */}
          {editing && (
            <div className="space-y-2">
              <button
                onClick={handleSaveProfile}
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={() => setEditing(false)}
                className="w-full p-3 bg-gray-300 hover:bg-gray-400 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};


export default Landing;
