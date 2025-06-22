import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { AuthView } from "./view";
import SignUpOrganizer from "@/components/auth/sign-up-organizer";
import { CardFooter } from "@/components/ui/card";
import Link from "next/link";
import SignIn from "@/components/auth/sign-in";

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

  const authRouter = (pathname: string) => {
    console.log("Auth Router Pathname:", pathname);
    if (pathname === "sign-up-organizer") {
      return <SignUpOrganizer />;
    } else if (pathname === "sign-in") {
      return <SignIn />;
    } else if (pathname === "sign-up") {
      return (
        <div>
          <AuthView pathname={pathname} />
          <CardFooter className="pl-4 mr-6">
            <div className="flex justify-center w-full border-t py-4">
              <p className="text-center text-xs text-neutral-500">
                <Link
                  href="/auth/sign-up-organizer"
                  className="text-blue-500 hover:text-blue-700 transition-colors text-sm font-medium"
                >
                  Sign up as an organizer
                </Link>
              </p>
            </div>
          </CardFooter>
        </div>
      );
    }
    return <AuthView pathname={pathname} />;
  };

  return <div>{authRouter(pathname)}</div>;
}
