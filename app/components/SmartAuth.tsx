"use client";
import React, { useState, useEffect } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";

export default function SmartAuth() {
  const [showSignUp, setShowSignUp] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const handleClerkError = (event: CustomEvent) => {
      const error = event.detail;

      if (
        error &&
        (error.code === "form_identifier_not_found" ||
          error.code === "identifier_not_found" ||
          (error.message && error.message.toLowerCase().includes("email")) ||
          (error.message &&
            error.message.toLowerCase().includes("not found")) ||
          (error.longMessage &&
            error.longMessage.toLowerCase().includes("account")))
      ) {
        setShowSignUp(true);
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            const errorElement = node.querySelector(
              '.cl-formFieldErrorText, [data-localization-key*="error"]',
            );
            if (errorElement && errorElement.textContent) {
              const errorText = errorElement.textContent.toLowerCase();
              if (
                errorText.includes("email") &&
                (errorText.includes("not found") ||
                  errorText.includes("doesn't exist") ||
                  errorText.includes("invalid"))
              ) {
                setShowSignUp(true);
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (showSignUp) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-4 text-center">
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold text-sm">
                ✨ Account Not Found
              </h3>
              <p className="text-blue-200 text-xs mt-1">
                No worries! We'll create your account automatically.
              </p>
            </div>
          </div>

          <SignUp
            signInUrl="/sign-in"
            initialValues={userEmail ? { emailAddress: userEmail } : undefined}
            appearance={{
              elements: {
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                card: "bg-white shadow-xl",
                headerTitle: "text-slate-800",
                headerSubtitle: "text-slate-600",
              },
            }}
          />

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowSignUp(false)}
              className="text-blue-400 text-sm hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="w-full max-w-md">
        <SignIn
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
              card: "bg-white shadow-xl",
              headerTitle: "text-slate-800",
              headerSubtitle: "text-slate-600",
            },
          }}
        />

        <div className="mt-4 text-center">
          <p className="text-white text-sm">
            Don't have an account?{" "}
            <button
              onClick={() => setShowSignUp(true)}
              className="text-blue-400 hover:underline"
            >
              Create one automatically
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
