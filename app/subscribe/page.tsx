"use client";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SubscribeButton from "../components/SubscribeButton";
import Menu from "../components/Menu";
import { motion } from "framer-motion";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Avatar,
  Divider,
} from "@nextui-org/react";
import { RiCheckLine, RiLogoutBoxLine } from "react-icons/ri";
import { useSubscription } from "../contexts/SubscriptionContext";

export default function SubscribePage() {
  const router = useRouter();
  const { isSignedIn, userId, isLoaded: authIsLoaded } = useAuth();
  const { signOut } = useClerk();
  const { user, isLoaded: userIsLoaded } = useUser();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { hasSubscription, isLoading } = useSubscription();

  const [priceData, setPriceData] = useState({
    amount: 4.99,
    currency: "usd",
    isLoading: true,
    error: null,
  });

  const shouldShowLoading = !authIsLoaded || !userIsLoaded || isLoading;

  useEffect(() => {
    if (authIsLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authIsLoaded, isSignedIn, router]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const response = await fetch("/api/subscription-price");
        const data = await response.json();

        setPriceData({
          amount: data.amount || 4.99,
          currency: data.currency || "usd",
          isLoading: false,
          error: data.error || null,
        });
      } catch (error) {
        setPriceData({
          amount: 4.99,
          currency: "usd",
          isLoading: false,
          error: "Could not load current pricing",
        });
      }
    };

    fetchPriceData();
  }, []);

  const handleReset = () => {
    router.push("/");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {}
  };

  const features = [
    "Unlimited AI voice detection checks",
    "Instant results",
    "High accuracy detection",
    "Advanced audio analysis",
    "Cancel anytime",
  ];

  return (
    <div className="min-h-screen bg-zinc-900 flex">
      <div
        className={`${isMobile ? "fixed bottom-0 w-full h-16" : "fixed left-0 h-screen"} z-50`}
      >
        <Menu
          onCollapse={setIsMenuCollapsed}
          onReset={handleReset}
          isAnalyzing={false}
          hasAnalysisResult={false}
        />
      </div>

      <div
        className={`flex items-center justify-center w-full p-4 ${!isMobile && !isMenuCollapsed ? "ml-[300px]" : !isMobile ? "ml-[75px]" : ""}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-zinc-800 border border-zinc-700">
            <CardBody className="text-center p-8">
              {}
              {shouldShowLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-12 h-12 mb-6 border-4 border-slate-400 border-t-blue-400 rounded-full animate-spin"></div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Loading...
                  </h2>
                  <p className="text-slate-400 text-sm text-center">
                    Please wait while we verify your account
                  </p>
                </div>
              ) : (
                <>
                  {}
                  {isSignedIn && user && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Avatar
                            showFallback
                            src={user.imageUrl}
                            name={
                              user.firstName?.[0] ||
                              user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ||
                              "U"
                            }
                            className="mr-2"
                          />
                          <div className="text-left">
                            <p className="text-white text-sm font-medium">
                              {user.firstName ||
                                user.emailAddresses[0]?.emailAddress?.split(
                                  "@",
                                )[0]}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {user.emailAddresses[0]?.emailAddress}
                            </p>
                          </div>
                        </div>
                        <Button
                          color="danger"
                          variant="flat"
                          startContent={<RiLogoutBoxLine />}
                          size="sm"
                          onClick={handleSignOut}
                        >
                          Sign Out
                        </Button>
                      </div>
                      <Divider className="my-2" />
                    </div>
                  )}

                  {}
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Upgrade to Pro
                  </h1>
                  <p className="text-slate-400 mb-6">
                    Get unlimited access to AI-SPY's advanced detection
                    capabilities
                  </p>

                  <div className="text-4xl font-bold text-white mb-2">
                    {priceData.isLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `$${priceData.amount}`
                    )}
                    <span className="text-lg text-slate-400 font-normal">
                      /month
                    </span>
                  </div>

                  {priceData.error && (
                    <p className="text-yellow-400 text-sm mb-2">
                      {priceData.error} (showing fallback price)
                    </p>
                  )}

                  <div className="mb-8">
                    <SubscribeButton />
                  </div>

                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-slate-300"
                      >
                        <RiCheckLine
                          className="text-green-500 mr-2"
                          size={20}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
