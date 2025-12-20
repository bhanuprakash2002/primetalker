// src/pages/Join.tsx
// Page for joining a room via shared link

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { joinRoom } from "@/lib/utils";

const Join = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [language, setLanguage] = useState("en");
    const [isJoining, setIsJoining] = useState(false);
    const [username, setUsername] = useState("");

    // Get username from localStorage if logged in
    useEffect(() => {
        const storedUsername = localStorage.getItem("username");
        if (storedUsername) {
            setUsername(storedUsername);
        }
    }, []);

    const handleJoinRoom = async () => {
        if (!roomId) {
            toast({
                title: "Error",
                description: "Invalid room ID",
                variant: "destructive",
            });
            return;
        }

        if (!language) {
            toast({
                title: "Language Required",
                description: "Please select your language before joining.",
                variant: "destructive",
            });
            return;
        }

        setIsJoining(true);

        try {
            const result = await joinRoom(roomId, language);

            if (!result.success) {
                throw new Error(result.message || "Failed to join room");
            }

            localStorage.setItem("myLanguage", language);
            localStorage.setItem("role", "receiver");

            // Store username if provided
            if (username) {
                localStorage.setItem("username", username);
            }

            toast({
                title: "Joined Room!",
                description: `Connected to room ${roomId}`,
            });

            navigate(`/meeting/${roomId}`);
        } catch (err: any) {
            toast({
                title: "Error Joining Room",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-primary border-2">
                <CardHeader className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                        <Globe className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Join Meeting</CardTitle>
                    <CardDescription>
                        You've been invited to join room <span className="font-mono font-bold text-foreground">{roomId}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Username (optional) */}
                    <div className="space-y-2">
                        <Label htmlFor="username">Your Name (optional)</Label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-background border p-2 rounded-md"
                        />
                    </div>

                    {/* Language Selection */}
                    <div className="space-y-2">
                        <Label>Your Language</Label>
                        <select
                            className="w-full bg-background border p-2 rounded-md"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="te">Telugu</option>
                            <option value="ta">Tamil</option>
                            <option value="bn">Bengali</option>
                            <option value="mr">Marathi</option>
                            <option value="gu">Gujarati</option>
                            <option value="kn">Kannada</option>
                            <option value="ml">Malayalam</option>
                            <option value="pa">Punjabi</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="pt">Portuguese</option>
                            <option value="ja">Japanese</option>
                            <option value="zh">Chinese</option>
                            <option value="ko">Korean</option>
                            <option value="ar">Arabic</option>
                            <option value="ru">Russian</option>
                        </select>
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleJoinRoom}
                        disabled={isJoining}
                    >
                        {isJoining ? "Joining..." : "Join Meeting"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                            Sign up
                        </Button>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default Join;
