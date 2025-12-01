"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type FormData = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function SetPasswordForm() {
  const t = useTranslations("organizer-dashboard.Profile");
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  // Password validation requirements
  const getPasswordValidation = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordValidation = newPassword
    ? getPasswordValidation(newPassword)
    : null;

  const isPasswordValid = passwordValidation
    ? Object.values(passwordValidation).every(Boolean)
    : false;

  const passwordStrength = passwordValidation
    ? Object.values(passwordValidation).filter(Boolean).length
    : 0;

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return "bg-red-500";
    if (strength < 4) return "bg-yellow-500";
    if (strength < 5) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return "Very Weak";
    if (strength < 4) return "Weak";
    if (strength < 5) return "Good";
    return "Strong";
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        toast.error(t("setPassword.errors.passwordMismatch"));
        return;
      }

      if (!isPasswordValid) {
        toast.error("Please ensure your password meets all requirements");
        return;
      }

      await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.oldPassword,
        revokeOtherSessions: true,
      });

      toast.success(t("setPassword.toasts.success"));
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    }
  };

  const ValidationItem = ({
    isValid,
    text,
  }: {
    isValid: boolean;
    text: string;
  }) => (
    <div
      className={cn(
        "flex items-center gap-2 text-sm transition-colors",
        isValid ? "text-green-600" : "text-gray-500"
      )}
    >
      {isValid ? (
        <CheckCircle size={16} className="text-green-600" />
      ) : (
        <XCircle size={16} className="text-gray-400" />
      )}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold pb-6">{t("setPassword.title")}</h2>
      <hr className="w-full text-black py-6" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Old Password */}
        <div className="space-y-2 w-full max-w-md">
          <Label htmlFor="oldPassword">
            {t("setPassword.labels.oldPassword")}
          </Label>
          <div className="relative">
            <Input
              id="oldPassword"
              className="py-6 pr-10"
              type={"password"}
              placeholder={t("setPassword.placeholders.oldPassword")}
              {...register("oldPassword", {
                required: t("setPassword.errors.oldPasswordRequired"),
                minLength: {
                  value: 1,
                  message: "Current password is required",
                },
              })}
            />
          </div>
          {errors.oldPassword && (
            <p className="text-sm text-red-500">{errors.oldPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-2 w-full max-w-md">
          <Label htmlFor="newPassword">
            {t("setPassword.labels.newPassword")}
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              className="py-6 pr-10"
              type={showNewPassword ? "text" : "password"}
              placeholder={t("setPassword.placeholders.newPassword")}
              {...register("newPassword", {
                required: t("setPassword.errors.newPasswordRequired"),
                validate: (value) => {
                  const validation = getPasswordValidation(value);
                  if (!validation.minLength)
                    return "Password must be at least 8 characters long";
                  if (!validation.hasUppercase)
                    return "Password must contain at least one uppercase letter";
                  if (!validation.hasLowercase)
                    return "Password must contain at least one lowercase letter";
                  if (!validation.hasNumber)
                    return "Password must contain at least one number";
                  if (!validation.hasSpecialChar)
                    return "Password must contain at least one special character";
                  return true;
                },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowNewPassword((prev) => !prev)}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Password Strength:</span>
                  <span
                    className={cn(
                      "font-medium",
                      passwordStrength < 2
                        ? "text-red-500"
                        : passwordStrength < 4
                          ? "text-yellow-500"
                          : passwordStrength < 5
                            ? "text-blue-500"
                            : "text-green-500"
                    )}
                  >
                    {getStrengthText(passwordStrength)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      getStrengthColor(passwordStrength)
                    )}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  Password must contain:
                </p>
                <ValidationItem
                  isValid={passwordValidation?.minLength || false}
                  text="At least 8 characters"
                />
                <ValidationItem
                  isValid={passwordValidation?.hasUppercase || false}
                  text="One uppercase letter (A-Z)"
                />
                <ValidationItem
                  isValid={passwordValidation?.hasLowercase || false}
                  text="One lowercase letter (a-z)"
                />
                <ValidationItem
                  isValid={passwordValidation?.hasNumber || false}
                  text="One number (0-9)"
                />
                <ValidationItem
                  isValid={passwordValidation?.hasSpecialChar || false}
                  text="One special character (!@#$%^&*)"
                />
              </div>
            </div>
          )}

          {errors.newPassword && (
            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2 w-full max-w-md">
          <Label htmlFor="confirmPassword">
            {t("setPassword.labels.confirmPassword")}
          </Label>
          <div className="relative">
            <Input
              className="py-6 pr-10"
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("setPassword.placeholders.confirmPassword")}
              {...register("confirmPassword", {
                required: t("setPassword.errors.confirmPasswordRequired"),
                validate: (value) => {
                  if (value !== watch("newPassword")) {
                    return t("setPassword.errors.passwordMismatch");
                  }
                  return true;
                },
              })}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && newPassword && (
            <div className="flex items-center gap-2 text-sm">
              {confirmPassword === newPassword ? (
                <>
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-green-600">Passwords match</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-500" />
                  <span className="text-red-500">Passwords do not match</span>
                </>
              )}
            </div>
          )}

          {errors.confirmPassword && (
            <p className="text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full max-w-md mt-6 py-6"
          disabled={
            isSubmitting || !isPasswordValid || newPassword !== confirmPassword
          }
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating Password...
            </div>
          ) : (
            t("setPassword.buttons.update")
          )}
        </Button>
      </form>
    </div>
  );
}
