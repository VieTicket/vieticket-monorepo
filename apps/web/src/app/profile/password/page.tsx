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
import { useTranslations } from "next-intl";

type FormData = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SetPasswordForm() {
  const t = useTranslations("organizer-dashboard.Profile");
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
      toast.error(t("setPassword.errors.passwordMismatch"));
      return;
    }
    await authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: data.oldPassword,
      revokeOtherSessions: true,
    });
    toast.success(t("setPassword.toasts.success"));
    reset();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold pb-6">{t("setPassword.title")}</h2>
      <hr className="w-full text-black py-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Old Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="oldPassword">{t("setPassword.labels.oldPassword")}</Label>
          <Input
            id="oldPassword"
            className="py-6"
            type="password"
            placeholder={t("setPassword.placeholders.oldPassword")}
            {...register("oldPassword", {
              required: t("setPassword.errors.oldPasswordRequired"),
            })}
          />
          {errors.oldPassword && (
            <p className="text-sm text-red-500">{errors.oldPassword.message}</p>
          )}
        </div>
        {/* New Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="newPassword">{t("setPassword.labels.newPassword")}</Label>
          <Input
            id="newPassword"
            className="py-6"
            type="password"
            placeholder={t("setPassword.placeholders.newPassword")}
            {...register("newPassword", {
              required: t("setPassword.errors.newPasswordRequired"),
            })}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
          )}
        </div>
        {/* Confirm Password */}
        <div className="space-y-2 w-1/2">
          <Label htmlFor="confirmPassword">{t("setPassword.labels.confirmPassword")}</Label>
          <div className="relative">
            <Input
              className="py-6"
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder={t("setPassword.placeholders.confirmPassword")}
              {...register("confirmPassword", {
                required: t("setPassword.errors.confirmPasswordRequired"),
                validate: (value) =>
                  value === watch("newPassword") || t("setPassword.errors.passwordMismatch"),
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
        <Button type="submit" className="w-1/2 mt-2 py-6">{t("setPassword.buttons.update")}</Button>
      </form>
    </div>
  );
}
