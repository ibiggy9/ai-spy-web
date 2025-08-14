"use client";

import React from "react";
import { Spinner } from "@nextui-org/react";

export default function Loading() {
  return (
    <div className="flex flex-col bg-black h-screen items-center justify-center w-full">
      <Spinner color="primary" size="lg" />
      <span className="ml-3 text-lg text-white">Loading...</span>
    </div>
  );
}
