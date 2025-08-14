"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useSubscription } from "../contexts/SubscriptionContext";

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { isSignedIn, getToken } = useAuth();
  const { refreshSubscription } = useSubscription();
  const router = useRouter();

  const handleSubscribe = async () => {
    try {
      if (!isSignedIn) {
        window.location.href = "https://accounts.ai-spy.xyz/sign-in";
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const token = await getToken();

      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || `HTTP error! status: ${response.status}`;
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        throw new Error(errorMsg);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        const errorMsg = "No checkout URL returned";
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        throw new Error(errorMsg);
      }
    } catch (error) {
      if (!errorMessage) {
        setErrorMessage(
          "Sorry, there was a problem starting your subscription. Please try again.",
        );
        setShowErrorModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  return (
    <>
      <Button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-md hover:opacity-90 transition-opacity relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
        size="lg"
      >
        {loading
          ? "Processing..."
          : isSignedIn
            ? "Start Unlimited Checks"
            : "Sign In to Continue"}
      </Button>

      <Modal isOpen={showErrorModal} onClose={closeErrorModal}>
        <ModalContent>
          <ModalHeader className="text-red-500">Subscription Error</ModalHeader>
          <ModalBody>
            <p>{errorMessage}</p>
            <p className="mt-2 text-sm">
              Please try again or contact support if the issue persists.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" onPress={closeErrorModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
