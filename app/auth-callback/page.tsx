"use client";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSubscription } from "../contexts/SubscriptionContext";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded: authIsLoaded } = useAuth();
  const { hasSubscription, isLoading } = useSubscription();

  useEffect(() => {
    if (!authIsLoaded || isLoading) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const customRedirect = searchParams.get("redirect");
    if (customRedirect) {
      router.replace(customRedirect);
      return;
    }

    if (hasSubscription) {
      router.replace("/");
    } else {
      router.replace("/subscribe");
    }
  }, [
    authIsLoaded,
    isSignedIn,
    isLoading,
    hasSubscription,
    router,
    searchParams,
  ]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mb-6 border-4 border-slate-400 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Signing you in...
        </h2>
        <p className="text-slate-400 text-sm">
          Please wait, this may take a few seconds...
        </p>
      </div>
    </div>
  );
}
