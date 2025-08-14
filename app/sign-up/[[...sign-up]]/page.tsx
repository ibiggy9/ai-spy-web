"use client";
import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <SignUp signInUrl="/sign-in" />
    </div>
  );
}
