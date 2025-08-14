"use client";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-slate-300 mb-8">
          Oops! This page seems to have wandered off.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          Go Home
        </Button>
      </motion.div>
    </div>
  );
}
