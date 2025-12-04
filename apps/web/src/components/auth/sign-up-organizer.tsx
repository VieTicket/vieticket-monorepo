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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { createOrganizerAction } from "@/lib/actions/organizer-actions";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import "./organizer-styles.css";

export default function SignUpOrganizer() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image" className="text-slate-300">
                Profile Image (optional)
              </Label>
              <div className="flex items-end gap-4">
                {imagePreview && (
                  <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-violet-400/30">
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 w-full">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full professional-button text-white file:text-violet-400 file:bg-transparent file:border-0"
                  />
                  {imagePreview && (
                    <X
                      className="cursor-pointer text-slate-400 hover:text-violet-400 transition-colors"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full professional-button hover:professional-button border-violet-400/50 hover:border-violet-400 bg-violet-600/20 hover:bg-violet-600/30 text-white"
              disabled={loading}
              onClick={async () => {
                await authClient.signUp.email({
                  ...({
                    email,
                    password,
                    name: `${firstName} ${lastName}`,
                    image: image ? await convertImageToBase64(image) : "",
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
                    onSuccess: async (ctx) => {
                      try {
                        // Create organizer record with isActive = false
                        const organizerResult = await createOrganizerAction(
                          ctx.data.user
                        );

                        if (organizerResult.success) {
                          toast.success(
                            "Please check your email to verify your account."
                          );
                          router.push("/auth/sign-in");
                        } else {
                          toast.error(
                            "Account created but failed to initialize organizer profile. Please contact support."
                          );
                          router.push("/auth/sign-in");
                        }
                      } catch (error) {
                        console.error(
                          "Error creating organizer profile:",
                          error
                        );
                        toast.error(
                          "Account created but failed to initialize organizer profile. Please contact support."
                        );
                        router.push("/auth/sign-in");
                      }
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

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
