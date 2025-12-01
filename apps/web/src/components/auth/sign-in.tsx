"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import { ErrorContext } from "better-auth/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as { role?: string })?.role;
      switch (role) {
        case "admin":
          router.replace("/admin");
          break;
        case "organizer":
          router.replace("/organizer");
          break;
        default:
          router.replace("/");
      }
    }
  }, [session, router]);

  const handleSubmit = async () => {
    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onResponse: () => {
          setLoading(false);
        },
        onError: (ctx: ErrorContext) => {
          toast.error(ctx.error.message || "An error occurred during login");
        },
        onSuccess: () => {
          toast.success("Login successful!");
        },
      }
    );
  };
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
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
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

      <Card className="ml-4 max-w-sm border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-white glow-text">
            Sign In
          </CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-400">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              <Input
                id="password"
                type="password"
                placeholder="password"
                autoComplete="password"
                className="professional-button text-white placeholder-slate-400"
                value={password}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit(); // your submit logic
                  }
                }}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                className="border-slate-600 text-violet-400"
                onClick={() => {
                  setRememberMe(!rememberMe);
                }}
              />
              <Label htmlFor="remember" className="text-slate-300">
                Remember me
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full professional-button hover:professional-button border-violet-400/50 hover:border-violet-400 bg-violet-600/20 hover:bg-violet-600/30 text-white"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p> Login </p>
              )}
            </Button>

            <div className="flex items-center justify-between">
              <hr className="w-full border-slate-600" />
              <span className="text-xs text-slate-400 w-full text-center">
                Or Continue With
              </span>
              <hr className="w-full border-slate-600" />
            </div>

            <div
              className={cn(
                "w-full gap-2 flex items-center",
                "justify-between flex-col"
              )}
            >
              <Button
                variant="outline"
                className={cn(
                  "w-full gap-2 professional-button border-slate-600 hover:border-violet-400/50 text-slate-300 hover:text-white"
                )}
                disabled={loading}
                onClick={async () => {
                  await authClient.signIn.social(
                    {
                      provider: "google",
                      callbackURL: "/",
                    },
                    {
                      onRequest: () => {
                        setLoading(true);
                      },
                      onResponse: () => {
                        setLoading(false);
                      },
                    }
                  );
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="0.98em"
                  height="1em"
                  viewBox="0 0 256 262"
                >
                  <path
                    fill="#4285F4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                  ></path>
                  <path
                    fill="#EB4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  ></path>
                </svg>
                Sign in with Google
              </Button>
            </div>

            <CardFooter className="px-0">
              <div className="flex justify-center w-full border-t border-slate-600 py-4">
                <p className="text-center text-xs text-slate-400">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </CardFooter>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
