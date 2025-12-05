"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateProfileAction,
  getProfileAction,
  uploadAvatarAction,
} from "@/lib/actions/profile-actions";
import { authClient } from "@/lib/auth/auth-client";
import { GENDER_VALUES } from "@vieticket/db/pg/schema";
import { Camera, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { ChangeEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { FileUploader } from "../ui/file-uploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markRejectionAsSeenAction } from "@/lib/actions/organizer-actions";

// A reusable component for input fields to reduce repetition
function FormField({
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  disabled = false,
  required = false,
  max,
  min,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  max?: string;
  min?: string;
  error?: string;
}) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={id} className="font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type={type}
        id={id}
        placeholder={placeholder}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
        max={max}
        min={min}
        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
      />
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// A reusable component for select fields
function SelectField({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  options,
  disabled = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
}) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={id} className="font-semibold text-slate-700">
        {label}
      </Label>
      <Select onValueChange={onValueChange} value={value} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AccountForm() {
  const t = useTranslations("organizer-dashboard.Profile");
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isOrganizerActive, setIsOrganizerActive] = useState<boolean | null>(
    null
  );
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // User fields from 'user' schema
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [phone, setPhone] = useState<string | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Organizer fields from 'organizers' schema
  const [organizerName, setOrganizerName] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [foundedDate, setFoundedDate] = useState<string | undefined>();
  const [organizerType, setOrganizerType] = useState<string | undefined>();
  const [taxCode, setTaxCode] = useState<string | undefined>();

  // Error states for form validation
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Fetch complete profile data
  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      startTransition(async () => {
        try {
          const profileResult = await getProfileAction();

          if (profileResult.success && profileResult.data) {
            const profile = profileResult.data;
            console.log("CLIENT: Profile data received:", profile);
            console.log("CLIENT: Session user role:", session.user.role);

            // Set user fields
            setName(profile.name || "");
            setDateOfBirth(
              profile.dateOfBirth
                ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
                : undefined
            );
            setGender(profile.gender || undefined);
            setPhone(profile.phone || undefined);
            setImagePreview(profile.image || null);

            // Handle organizer status and rejection
            if (session.user.role === "organizer") {
              console.log("CLIENT: User is organizer, checking organizer data...");
              if (profile.organizer) {
                console.log("CLIENT: Organizer data found:", profile.organizer);
                // Check if there's an unseen rejection
                if (
                  profile.organizer.rejectionReason &&
                  profile.organizer.rejectionSeen === false
                ) {
                  setRejectionReason(profile.organizer.rejectionReason);
                  setShowRejectionModal(true);
                }

                console.log("CLIENT: Setting organizer fields...");
                console.log("- organizerName:", profile.organizer.name);
                console.log("- website:", profile.organizer.website);
                console.log("- address:", profile.organizer.address);
                console.log("- foundedDate:", profile.organizer.foundedDate);
                console.log("- organizerType:", profile.organizer.organizerType);
                console.log("- taxCode:", profile.organizer.taxCode);
                
                setOrganizerName(profile.organizer.name || "");
                setWebsite(profile.organizer.website || "");
                setAddress(profile.organizer.address || "");
                setFoundedDate(
                  profile.organizer.foundedDate
                    ? new Date(profile.organizer.foundedDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                );
                setOrganizerType(profile.organizer.organizerType || "");
                setTaxCode(profile.organizer.taxCode || "");
                setIsOrganizerActive(profile.organizer.isActive || false);
              } else {
                console.log("CLIENT: WARNING - No organizer data in profile!");
                setIsOrganizerActive(false);
              }
            }
          } else {
            // Fallback to session data
            setName(session.user.name || "");
            setImagePreview(session.user.image || null);

            if (session.user.role === "organizer") {
              setIsOrganizerActive(false);
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast.error(t("toasts.loadFailed"));

          // Fallback to session data
          setName(session.user.name || "");
          setImagePreview(session.user.image || null);

          if (session.user.role === "organizer") {
            setIsOrganizerActive(false);
          }
        } finally {
          setLoading(false);
        }
      });
    }
  }, [session]);

  const handleAvatarUpload = async (response: any) => {
    const url = response.secure_url;
    const result = await uploadAvatarAction(url);
    if (result.success) {
      setImagePreview(url);
      toast.success(t("toasts.avatarUpdated"));
    } else {
      toast.error(result.message);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        let imageBase64 = imagePreview;
        if (imageFile) {
          imageBase64 = await convertImageToBase64(imageFile);
        }

        const formData = {
          name,
          dateOfBirth,
          gender,
          phone,
          image: imageBase64,
          organizerDetails:
            session?.user.role === "organizer"
              ? {
                  organizerName,
                  website,
                  address,
                  foundedDate,
                  organizerType,
                  taxCode,
                }
              : undefined,
        };

        const result = await updateProfileAction(formData);

        if (result.success) {
          // Clear errors and show success
          setErrors({});
          toast.success(result.message || t("toasts.saveSuccess"));
          // Reset the image file after successful save
          setImageFile(null);
        } else {
          // Display field-specific errors
          if (result.errors) {
            setErrors(result.errors as Record<string, string[]>);
            toast.error("Please fix the errors in the form.");
          } else {
            toast.error(result.message || t("toasts.saveFailed"));
          }
        }
      } catch (error) {
        console.error("Error saving profile:", error);
        toast.error(t("toasts.saveFailed"));
      }
    });
  };

  const handleRejectionModalClose = async () => {
    try {
      const result = await markRejectionAsSeenAction();

      if (result.success) {
        setShowRejectionModal(false);
        toast.success(t("rejection.markedSeen"));
      } else {
        console.error("Failed to mark rejection as seen:", result.error);
        // Still close the modal even if the API call fails
        setShowRejectionModal(false);
      }
    } catch (error) {
      console.error("Error marking rejection as seen:", error);
      // Still close the modal even if the API call fails
      setShowRejectionModal(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <span className="ml-2 text-slate-500">{t("loadingProfile")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Rejection Modal */}
      <Dialog
        open={showRejectionModal}
        onOpenChange={(open) => {
          if (!open) {
            handleRejectionModalClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {t("rejection.title")}
            </DialogTitle>
            <DialogDescription>{t("rejection.description")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                {t("rejection.reasonTitle")}
              </h4>
              <p className="text-red-700">{rejectionReason}</p>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>{t("rejection.helpText")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRejectionModalClose}>
              {t("rejection.button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organizer Status Alert */}
      {session?.user.role === "organizer" &&
        isOrganizerActive !== null &&
        !showRejectionModal && (
          <Alert
            className={
              isOrganizerActive
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50"
            }
          >
            {isOrganizerActive ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription
              className={
                isOrganizerActive ? "text-green-800" : "text-orange-800"
              }
            >
              {isOrganizerActive
                ? t("organizerStatus.active")
                : t("organizerStatus.pending")}
            </AlertDescription>
          </Alert>
        )}

      {/* Profile Photo Section */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          {t("photo.title")}
        </h3>
        <div className="flex items-center gap-4">
          <Avatar className="w-28 h-28">
            <AvatarImage src={imagePreview ?? undefined} alt={name} />
            <AvatarFallback>
              {name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <FileUploader
            mode="button"
            buttonLabel={t("photo.uploadButton")}
            folder="avatars"
            onUploadSuccess={handleAvatarUpload}
          />
        </div>
      </section>

      {/* Personal Information Section */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          {t("personalInfo.title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="name"
            label={t("labels.fullName")}
            placeholder={t("placeholders.fullName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name?.[0]}
          />
          <FormField
            id="email"
            label={t("labels.email")}
            placeholder={t("placeholders.email")}
            value={session.user.email}
            disabled
          />
          <FormField
            id="dateOfBirth"
            label={t("labels.dateOfBirth")}
            placeholder={t("placeholders.dateOfBirth")}
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={(() => {
              // Max: Yesterday (must be in the past)
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              return yesterday.toISOString().split('T')[0];
            })()}
            min={(() => {
              // Min: 13 years ago from today
              const minDate = new Date();
              minDate.setFullYear(minDate.getFullYear() - 120);
              return minDate.toISOString().split('T')[0];
            })()}
            error={errors.dateOfBirth?.[0]}
          />
          <SelectField
            id="gender"
            label={t("labels.gender")}
            placeholder={t("placeholders.gender")}
            options={GENDER_VALUES}
            value={gender}
            onValueChange={setGender}
          />
        </div>
      </section>

      {/* Contact Details Section */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          {t("contact.title")}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {t("contact.description")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="phone"
            label={t("labels.phone")}
            placeholder={t("placeholders.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </section>

      {/* Organizer Details Section */}
      {session.user.role === "organizer" && (
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {t("organizerDetails.title")}
            <span className="text-red-500 ml-1">*</span>
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {t("organizerDetails.description")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="organizerName"
              label={t("organizerDetails.organizerName")}
              placeholder={t("placeholders.organizerName")}
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              required
              error={errors["organizerDetails.organizerName"]?.[0]}
            />
            <FormField
              id="taxCode"
              label={t("organizerDetails.taxCode")}
              placeholder={t("placeholders.taxCode")}
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              required
              error={errors["organizerDetails.taxCode"]?.[0]}
            />
            <FormField
              id="website"
              label={t("organizerDetails.website")}
              placeholder={t("placeholders.website")}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              error={errors["organizerDetails.website"]?.[0]}
            />
            <FormField
              id="address"
              label={t("organizerDetails.address")}
              placeholder={t("placeholders.address")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors["organizerDetails.address"]?.[0]}
            />
            <FormField
              id="foundedDate"
              label={t("organizerDetails.foundedDate")}
              placeholder={t("placeholders.foundedDate")}
              type="date"
              value={foundedDate}
              onChange={(e) => setFoundedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              min="1800-01-01"
              error={errors["organizerDetails.foundedDate"]?.[0]}
            />
            <FormField
              id="organizerType"
              label={t("organizerDetails.organizerType")}
              placeholder={t("placeholders.organizerType")}
              value={organizerType}
              onChange={(e) => setOrganizerType(e.target.value)}
              error={errors["organizerDetails.organizerType"]?.[0]}
            />
          </div>
        </section>
      )}

      {/* Save Button */}
      <div className="flex justify-start">
        <Button
          size="lg"
          className="bg-slate-800 hover:bg-slate-900 text-white"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {session?.user.role === "organizer" && !isOrganizerActive
            ? t("buttons.submitForApproval")
            : t("buttons.saveProfile")}
        </Button>
      </div>
    </div>
  );
}
