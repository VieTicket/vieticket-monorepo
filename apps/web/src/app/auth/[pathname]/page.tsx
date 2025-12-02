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

  if (pathname === "settings") {
    const sessionData = await auth.api.getSession({ headers: await headers() });
    if (!sessionData) redirect("/auth/sign-in?redirectTo=/auth/settings");
  }

  const authRouter = (pathname: string) => {
    if (pathname === "sign-up-organizer") {
      return (
        <div>
          <SignUpOrganizer />
          <CardFooter className="px-0">
            <div className="flex justify-center w-full border-t border-slate-600 py-4">
              <p className="text-center text-xs text-slate-400">
                <Link
                  href="/auth/sign-up"
                  className="text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium"
                >
                  Sign up as Customer
                </Link>
              </p>
            </div>
          </CardFooter>
        </div>
      );
    } else if (pathname === "sign-in") {
      return <SignIn />;
    } else if (pathname === "sign-up") {
      return (
        <div>
          <AuthView pathname={pathname} />
          <CardFooter className="px-0">
            <div className="flex justify-center w-full border-t border-slate-600 py-4">
              <p className="text-center text-xs text-slate-400">
                <Link
                  href="/auth/sign-up-organizer"
                  className="text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium"
                >
                  Sign up as Organizer
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
