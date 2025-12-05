"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, MouseEvent, useState } from "react";
import { toast } from "sonner";


export default function SignUpOrganizer() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPasswordMismatch =
    passwordConfirmation.length > 0 && password !== passwordConfirmation;

  return (
    <>
      {/* Professional Styles */}
      <style jsx>{`
        .professional-card {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.3s ease;
        }

        .professional-card:hover {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow:
            0 10px 25px -3px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(139, 92, 246, 0.1);
          transform: translateY(-2px);
        }

        .glow-text {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Force white color for all h3 elements in this component */
        h3 {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Force override CardTitle specifically */
        .card-title {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Nuclear override for this specific component */
        :global(.card-title),
        :global(h3[class*="card-title"]),
        :global([data-slot="card-title"]) {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Target the exact element structure */
        div[data-slot="card-title"] {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Global override for any card title */
        :global(div[data-slot="card-title"]) {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Super specific override */
        :global(div[data-slot="card-title"].font-semibold) {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        /* Even more specific with class combination */
        :global(div[data-slot="card-title"][class*="text-lg"]) {
          color: white !important;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5) !important;
        }

        .professional-button {
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.1),
            rgba(79, 70, 229, 0.1)
          );
          border: 1px solid rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
        }

        .professional-button:hover {
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.2),
            rgba(79, 70, 229, 0.2)
          );
          border: 1px solid rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          transform: scale(1.02);
        }
      `}</style>

      <Card className="ml-4 z-50 rounded-md max-w-sm border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle
            className="text-lg md:text-xl text-white glow-text !text-white card-title"
            style={{ color: "white !important" }}
          >
            Sign Up
          </CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-400">
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name" className="text-slate-300">
                  First name
                </Label>
                <Input
                  id="first-name"
                  placeholder="Max"
                  required
                  className="professional-button text-white placeholder-slate-400"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setFirstName(e.target.value);
                  }}
                  value={firstName}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name" className="text-slate-300">
                  Last name
                </Label>
                <Input
                  id="last-name"
                  placeholder="Robinson"
                  required
                  className="professional-button text-white placeholder-slate-400"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setLastName(e.target.value);
                  }}
                  value={lastName}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                className="professional-button text-white placeholder-slate-400"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                }}
                value={email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                className="professional-button text-white placeholder-slate-400"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                placeholder="Password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-300">
                Confirm Password
              </Label>
              <Input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                className="professional-button text-white placeholder-slate-400"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPasswordConfirmation(e.target.value)
                }
                autoComplete="new-password"
                placeholder="Confirm Password"
              />
              {isPasswordMismatch && (
                <p className="text-xs text-rose-400">Passwords do not match.</p>
              )}
            </div>
            <Button
              type="button"
              className="w-full professional-button hover:professional-button border-violet-400/50 hover:border-violet-400 bg-violet-600/20 hover:bg-violet-600/30 text-white"
              disabled={loading || isPasswordMismatch}
              onClick={async (e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();

                // Guard: Don't proceed if passwords don't match
                if (password !== passwordConfirmation) {
                  toast.error("Passwords do not match.");
                  return;
                }

                // Guard: Don't proceed if already loading
                if (loading) {
                  return;
                }

                await authClient.signUp.email({
                  ...({
                    email,
                    password,
                    name: `${firstName} ${lastName}`,
                    role: "organizer",
                  } as unknown as Parameters<
                    typeof authClient.signUp.email
                  >[0]),
                  callbackURL: "/organizer",
                  fetchOptions: {
                    onResponse: () => {
                      setLoading(false);
                    },
                    onRequest: () => {
                      setLoading(true);
                    },
                    onError: (ctx) => {
                      toast.error(ctx.error.message);
                    },
                    onSuccess: async () => {
                      // Organizer profile is automatically created via database hook
                      toast.success(
                        "Please check your email to verify your account."
                      );
                      router.push("/auth/sign-in");
                    },
                  },
                });
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Create an account"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
