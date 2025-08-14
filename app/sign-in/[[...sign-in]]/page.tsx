"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SmartAuth from "../../components/SmartAuth";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return <SmartAuth />;
}
