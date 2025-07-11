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
import { updateProfileAction, getProfileAction, uploadAvatarAction } from "@/lib/actions/profile-actions";
import { authClient } from "@/lib/auth/auth-client";
import { GENDER_VALUES } from "@vieticket/db/postgres/schema";
import { Camera, Loader2 } from "lucide-react";
import { ChangeEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileUploader } from "../ui/file-uploader";

// A reusable component for input fields to reduce repetition
function FormField({
    id,
    label,
    placeholder,
    type = "text",
    value,
    onChange,
    disabled = false,
}: {
    id: string;
    label: string;
    placeholder: string;
    type?: string;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={id} className="font-semibold text-slate-700">
                {label}
            </Label>
            <Input
                type={type}
                id={id}
                placeholder={placeholder}
                value={value || ""}
                onChange={onChange}
                disabled={disabled}
            />
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
    const { data: session } = authClient.useSession();
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

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

    // Fetch complete profile data
    useEffect(() => {
        if (session?.user) {
            setLoading(true);
            startTransition(async () => {
                try {
                    const profileResult = await getProfileAction();

                    if (profileResult.success && profileResult.data) {
                        const profile = profileResult.data;

                        // Set user fields
                        setName(profile.name || "");
                        setDateOfBirth(profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : undefined);
                        setGender(profile.gender || undefined);
                        setPhone(profile.phone || undefined);
                        setImagePreview(profile.image || null);

                        // Only populate organizer fields if user is an organizer AND organizer data exists
                        if (session.user.role === "organizer" && profile.organizer) {
                            setOrganizerName(profile.organizer.name || "");
                            setWebsite(profile.organizer.website || "");
                            setAddress(profile.organizer.address || "");
                            setFoundedDate(profile.organizer.foundedDate ? new Date(profile.organizer.foundedDate).toISOString().split('T')[0] : "");
                            setOrganizerType(profile.organizer.organizerType || "");
                        }
                    } else {
                        // Fallback to session data
                        setName(session.user.name || "");
                        setImagePreview(session.user.image || null);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    toast.error("Failed to load profile data");

                    // Fallback to session data
                    setName(session.user.name || "");
                    setImagePreview(session.user.image || null);
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
            toast.success("Avatar updated!");
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
                            }
                            : undefined,
                };

                const result = await updateProfileAction(formData);

                if (result.success) {
                    toast.success(result.message);
                    // Reset the image file after successful save
                    setImageFile(null);
                } else {
                    toast.error(result.message);
                    if (result.errors) {
                        console.error("Validation errors:", result.errors);
                    }
                }
            } catch (error) {
                console.error("Error saving profile:", error);
                toast.error("Failed to save profile");
            }
        });
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
                <span className="ml-2 text-slate-500">Loading profile...</span>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Profile Photo Section */}
            <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                    Profile Photo
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
                        buttonLabel="Upload New Avatar"
                        folder="avatars"
                        onUploadSuccess={handleAvatarUpload}
                    />
                </div>
            </section>

            {/* Personal Information Section */}
            <section>
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                    Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        id="name"
                        label="Full Name:"
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <FormField
                        id="email"
                        label="Email:"
                        placeholder="Email"
                        value={session.user.email}
                        disabled
                    />
                    <FormField
                        id="dateOfBirth"
                        label="Date of Birth:"
                        placeholder="YYYY-MM-DD"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                    <SelectField
                        id="gender"
                        label="Gender:"
                        placeholder="Select gender"
                        options={GENDER_VALUES}
                        value={gender}
                        onValueChange={setGender}
                    />
                </div>
            </section>

            {/* Contact Details Section */}
            <section>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                    Contact Details
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    These details are private and only used to contact you for ticketing
                    or prizes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        id="phone"
                        label="Phone Number:"
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
            </section>

            {/* Organizer Details Section */}
            {session.user.role === "organizer" && (
                <section>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">
                        Organizer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            id="organizerName"
                            label="Organizer Name:"
                            placeholder="Enter organizer name"
                            value={organizerName}
                            onChange={(e) => setOrganizerName(e.target.value)}
                        />
                        <FormField
                            id="website"
                            label="Website:"
                            placeholder="https://example.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                        <FormField
                            id="address"
                            label="Address:"
                            placeholder="Enter address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                        <FormField
                            id="foundedDate"
                            label="Founded Date:"
                            placeholder="YYYY-MM-DD"
                            type="date"
                            value={foundedDate}
                            onChange={(e) => setFoundedDate(e.target.value)}
                        />
                        <FormField
                            id="organizerType"
                            label="Organizer Type:"
                            placeholder="e.g. Entertainment, Cultural"
                            value={organizerType}
                            onChange={(e) => setOrganizerType(e.target.value)}
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
                    Save My Profile
                </Button>
            </div>
        </div>
    );
}