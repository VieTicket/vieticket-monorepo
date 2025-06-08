import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { AuthView } from "./view";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((pathname) => ({ pathname }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string }>;
}) {
  const { pathname } = await params;

  // **EXAMPLE** SSR route protection for /auth/settings
  // NOTE: This opts /auth/settings out of static rendering
  // It already handles client side protection via useAuthenticate
  if (pathname === "settings") {
    const sessionData = await auth.api.getSession({ headers: await headers() });
    if (!sessionData) redirect("/auth/sign-in?redirectTo=/auth/settings");
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-1/2 bg-[#2D2A39] text-white flex-col justify-center px-16">
        <h1 className="text-4xl font-bold mb-4">Discover tailored events.</h1>
        <p className="text-2xl">
          Sign in for personalized recommendations today!
        </p>
      </div>
      <div className="w-full lg:w-1/2 flex justify-center items-center p-8">
        <AuthView pathname={pathname} />
      </div>
    </div>
  );
}
