"use client";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { NextUIProvider } from "@nextui-org/react";
import { Inter, Roboto } from "next/font/google";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { dark } from "@clerk/themes";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300"],
  variable: "--font-inter",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.className} font-sans`}>
      <body className="h-screen flex flex-col">
        <ClerkProvider
          allowedRedirectOrigins={["https://app.ai-spy.xyz"]}
          signInFallbackRedirectUrl="/auth-callback"
          signUpFallbackRedirectUrl="/auth-callback"
          appearance={{
            baseTheme: dark,
          }}
        >
          <SubscriptionProvider>
            <main className="flex-grow">{children}</main>
          </SubscriptionProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
