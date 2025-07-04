"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";

type FormData = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SetPasswordForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    await authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.oldPassword,
      revokeOtherSessions: true,
    });
    toast.success("Password updated successfully");
    reset();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold pb-6">Set Password</h2>
      <hr className="w-full text-black py-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Old Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="oldPassword">Old Password</Label>
          <Input
            id="oldPassword"
            className="py-6"
            type="password"
            placeholder="Enter your old password"
            {...register("oldPassword", {
              required: "Old password is required",
            })}
          />
          {errors.oldPassword && (
            <p className="text-sm text-red-500">{errors.oldPassword.message}</p>
          )}
        </div>
        {/* New Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="newPassword">Password</Label>
          <Input
            id="newPassword"
            className="py-6"
            type="password"
            placeholder="Enter your new password"
            {...register("newPassword", {
              required: "New password is required",
            })}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
          )}
        </div>
        {/* Confirm Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              className="py-6"
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === watch("newPassword") || "Passwords do not match",
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        {/* Submit Button */}
        <Button type="submit" className="w-1/2 mt-2 py-6">
          Update Password
        </Button>
      </form>
    </div>
  );
}
