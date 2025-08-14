"use client";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Menu from "../components/Menu";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();
  const subscriptionSuccess = searchParams.get("subscription") === "success";
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded && !userId) {
      window.location.href = "https://accounts.ai-spy.xyz/sign-in";
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    if (subscriptionSuccess) {
      setShowSuccess(true);

      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [subscriptionSuccess]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!userId) {
    return <div>Redirecting to sign in...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      {showSuccess && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline">
            {" "}
            Your subscription has been activated. You now have full access to
            all Pro features.
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {}
    </div>
  );
}
