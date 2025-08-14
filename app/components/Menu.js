"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { BiMessageDetail } from "react-icons/bi";
import { RiMenuFoldLine, RiMenuUnfoldLine } from "react-icons/ri";
import { RiMusicFill } from "react-icons/ri";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Tooltip } from "@nextui-org/tooltip";
import { RiVoiceprintFill } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import {
  RiLogoutBoxLine,
  RiLoginBoxLine,
  RiUserLine,
  RiRefreshLine,
} from "react-icons/ri";
import { useAuth, useClerk } from "@clerk/nextjs";
import { FaCrown } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import { useSubscription } from "../contexts/SubscriptionContext";

export default function Menu({
  onCollapse,
  onReset,
  isAnalyzing = false,
  hasAnalysisResult = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(true);
  const currentPath = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const { hasSubscription, isLoading, isActivating, refreshSubscription } =
    useSubscription();

  const isScanButtonEnabled = isAnalyzing || hasAnalysisResult;

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const mobile = window.innerWidth < 768;
        const tablet = window.innerWidth < 1024;
        setIsMobile(mobile);
        if (mobile || tablet) {
          setIsCollapsed(true);
          setShowExpandButton(false);
        } else {
          setIsCollapsed(false);
          setShowExpandButton(true);
          setIsMenuOpen(false);
        }
      }
    };

    handleResize();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [currentPath]);

  useEffect(() => {
    onCollapse?.(isCollapsed);
  }, [isCollapsed, onCollapse]);

  const subscriptionStatusComponent = (
    <div
      className={`flex flex-row items-center w-full px-4 py-2 rounded-lg mb-2 ${
        hasSubscription
          ? "bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-amber-500/50"
          : isActivating
            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50"
            : "bg-slate-700/50"
      }`}
    >
      <FaCrown
        size={16}
        color={
          hasSubscription ? "#f59e0b" : isActivating ? "#3b82f6" : "#64748b"
        }
        className="mr-2"
      />
      <div
        className={`text-xs ${hasSubscription ? "text-amber-400" : isActivating ? "text-blue-400" : "text-slate-400"}`}
      >
        {isLoading
          ? "Checking..."
          : isActivating
            ? "Activating..."
            : hasSubscription
              ? "Pro Member"
              : "Free Plan"}
      </div>
    </div>
  );

  const subscriptionStatusComponentCollapsed = (
    <Tooltip
      content={
        isLoading
          ? "Checking subscription..."
          : isActivating
            ? "Activating subscription..."
            : hasSubscription
              ? "Pro Member"
              : "Free Plan"
      }
      placement="right"
    >
      <div
        className={`flex flex-row items-center justify-center mb-1 w-full px-4 py-4 rounded-2xl ${
          hasSubscription
            ? "bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-amber-500/50"
            : isActivating
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50"
              : "bg-slate-700/50"
        }`}
      >
        <FaCrown
          size={16}
          color={
            hasSubscription ? "#f59e0b" : isActivating ? "#3b82f6" : "#64748b"
          }
        />
      </div>
    </Tooltip>
  );

  const loadingSpinnerComponent = (
    <div className="flex flex-row items-center w-full px-4 py-3 bg-slate-800/50 rounded-lg mb-2">
      <div className="w-4 h-4 mr-2 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin"></div>
      <div className="text-slate-400 text-xs">Checking subscription...</div>
    </div>
  );

  const loadingSpinnerComponentCollapsed = (
    <Tooltip content="Checking subscription..." placement="right">
      <div className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 rounded-2xl bg-slate-800/50">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    </Tooltip>
  );

  const subscribeButtonComponent =
    !hasSubscription && !isLoading ? (
      <Link
        href="/subscribe"
        onClick={() => setIsMenuOpen(false)}
        className="flex flex-row items-center w-full px-4 py-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/50 hover:border-purple-400/70 rounded-lg mb-2 transition-all duration-200 group"
      >
        <HiSparkles
          size={16}
          color="#a855f7"
          className="mr-2 group-hover:text-blue-400 transition-colors"
        />
        <div className="text-purple-300 group-hover:text-white text-xs font-medium transition-colors">
          Upgrade to Pro
        </div>
      </Link>
    ) : null;

  const subscribeButtonComponentCollapsed =
    !hasSubscription && !isLoading ? (
      <Tooltip content="Upgrade to Pro" placement="right">
        <Link
          href="/subscribe"
          className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-blue-600/30 rounded-2xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 hover:border-purple-400/70 transition-all duration-200 group"
        >
          <HiSparkles
            size={16}
            color="#a855f7"
            className="group-hover:text-blue-400 transition-colors"
          />
        </Link>
      </Tooltip>
    ) : null;

  const upgradeButtonForGuestsComponent = (
    <a
      href="https://accounts.ai-spy.xyz/sign-in"
      onClick={() => setIsMenuOpen(false)}
      className="flex flex-row items-center w-full px-4 py-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/50 hover:border-purple-400/70 rounded-lg mb-2 transition-all duration-200 group"
    >
      <HiSparkles
        size={16}
        color="#a855f7"
        className="mr-2 group-hover:text-blue-400 transition-colors"
      />
      <div className="text-purple-300 group-hover:text-white text-xs font-medium transition-colors">
        Upgrade to Pro
      </div>
    </a>
  );

  const upgradeButtonForGuestsComponentCollapsed = (
    <Tooltip content="Upgrade to Pro" placement="right">
      <a
        href="https://accounts.ai-spy.xyz/sign-in"
        className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-blue-600/30 rounded-2xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 hover:border-purple-400/70 transition-all duration-200 group"
      >
        <HiSparkles
          size={16}
          color="#a855f7"
          className="group-hover:text-blue-400 transition-colors"
        />
      </a>
    </Tooltip>
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {}
  };

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {!isMenuOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              onClick={() => setIsMenuOpen(true)}
              className="fixed top-4 left-4 z-50 p-2 text-white hover:bg-slate-700 rounded-full"
            >
              <RiMenuUnfoldLine size={24} />
            </motion.button>
          )}

          {isMenuOpen && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "linear" }}
              className="fixed inset-0 bg-zinc-800 z-40 flex flex-col"
            >
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-white hover:bg-slate-700 rounded-full"
                >
                  <RiMenuFoldLine size={24} />
                </button>
              </div>

              <div className="flex flex-col items-center p-4">
                <Image
                  alt="Company Logo"
                  src="/assets/logo3.png"
                  width={150}
                  height={150}
                />
                <div className="text-white text-center pb-4 text-lg font-bold">
                  Ai-SPY
                </div>
                <div className="text-white w-full pb-3 text-center italic text-sm">
                  Ai-Speech Detection
                </div>

                <Link
                  href="/"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onReset?.();
                  }}
                  className={`flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2`}
                >
                  <RiMusicFill size={20} color="white" className="mr-3" />
                  <div className="text-white text-sm">Audio Analysis</div>
                </Link>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onReset?.();
                  }}
                  disabled={!isScanButtonEnabled}
                  className={`flex flex-row items-center w-full px-4 py-4 rounded-2xl mb-2 ${
                    isScanButtonEnabled
                      ? "hover:bg-slate-700"
                      : "opacity-50 cursor-not-allowed bg-slate-700/30"
                  }`}
                >
                  <AiOutlinePlus size={20} color="white" className="mr-3" />
                  <div className="text-white text-sm">Scan New File</div>
                </button>

                {}

                <a
                  href="mailto:info@ai-spy.xyz"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2"
                >
                  <BiMessageDetail size={20} color="white" className="mr-3" />
                  <div className="text-white text-sm">Get in Touch</div>
                </a>

                {}
                {isSignedIn && (
                  <Link
                    href="/billing"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2 ${currentPath === "/billing" && "bg-slate-700"}`}
                  >
                    <RiUserLine size={20} color="white" className="mr-3" />
                    <div className="text-white text-sm">My Account</div>
                  </Link>
                )}

                {}
                {isSignedIn && (
                  <button
                    onClick={() => {
                      refreshSubscription();
                      setIsMenuOpen(false);
                    }}
                    className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2"
                  >
                    <RiRefreshLine size={20} color="white" className="mr-3" />
                    <div className="text-white text-sm">Refresh Status</div>
                  </button>
                )}

                {}
                {isSignedIn ? (
                  <>
                    {subscriptionStatusComponent}
                    {isLoading && loadingSpinnerComponent}
                    {subscribeButtonComponent}
                  </>
                ) : (
                  <>{upgradeButtonForGuestsComponent}</>
                )}

                {isSignedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2 mt-auto"
                  >
                    <RiLogoutBoxLine size={20} color="white" className="mr-3" />
                    <div className="text-white text-sm">Sign Out</div>
                  </button>
                ) : (
                  <a
                    href="https://accounts.ai-spy.xyz/sign-in"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2 mt-auto"
                  >
                    <RiLoginBoxLine size={20} color="white" className="mr-3" />
                    <div className="text-white text-sm">Sign In</div>
                  </a>
                )}
              </div>

              <div className="mt-auto p-4 text-center">
                <p className="text-slate-300 text-xs">
                  Ai-SPY can make mistakes, so double check results.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Not trained to detect AI-generated music, only speech.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      initial={{ width: "75px" }}
      animate={{ width: isCollapsed ? "75px" : "300px" }}
      transition={{ duration: 0.3, ease: "linear" }}
      className="bg-zinc-800 h-screen flex flex-col justify-between border-slate-600"
    >
      <div className="flex flex-col items-center p-2">
        {showExpandButton && (
          <Tooltip content={isCollapsed ? "Expand menu" : "Collapse menu"}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-2 text-white hover:bg-slate-700 rounded-full ${isCollapsed ? "self-center" : "self-end"}`}
            >
              {isCollapsed ? (
                <RiMenuUnfoldLine size={20} />
              ) : (
                <RiMenuFoldLine size={20} />
              )}
            </button>
          </Tooltip>
        )}

        <motion.div
          animate={{
            width: isCollapsed ? "50px" : "200px",
            height: isCollapsed ? "50px" : "200px",
            marginBottom: isCollapsed ? "8px" : "0px",
          }}
          transition={{ duration: 0.3, ease: "linear" }}
          className="relative"
        >
          <Image
            alt="Company Logo"
            src="/assets/logo3.png"
            fill
            style={{ objectFit: "contain" }}
          />
        </motion.div>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="text-white text-center pb-4 text-lg font-bold">
              Ai-SPY
            </div>
            <div className="text-white w-full pb-3 text-center italic text-sm">
              Ai-Speech Detection
            </div>
          </motion.div>
        )}

        {isCollapsed ? (
          <Tooltip content="Audio Analysis" placement="right">
            <Link
              href="/"
              className={`flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl ${currentPath === "/" && "bg-slate-700"}`}
            >
              <RiVoiceprintFill size={20} color="white" />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href="/"
            className={`flex flex-row items-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl ${currentPath === "/" && "bg-slate-700"}`}
          >
            <RiVoiceprintFill size={20} color="white" className="mr-3" />
            <div className="text-white text-sm">Speech Analysis</div>
          </Link>
        )}

        {isCollapsed ? (
          <Tooltip
            content={
              isScanButtonEnabled
                ? "Scan New File"
                : "Scan New File - Disabled\nUpload a File First!"
            }
            placement="right"
          >
            <button
              onClick={onReset}
              disabled={!isScanButtonEnabled}
              className={`flex flex-row items-center justify-center mb-1 w-full px-4 py-4 rounded-2xl ${
                isScanButtonEnabled
                  ? "hover:bg-slate-700"
                  : "opacity-50 cursor-not-allowed bg-slate-700/30"
              }`}
            >
              <AiOutlinePlus size={20} color="white" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={onReset}
            disabled={!isScanButtonEnabled}
            className={`flex flex-row items-center mb-1 w-full px-4 py-4 rounded-2xl ${
              isScanButtonEnabled
                ? "hover:bg-slate-700"
                : "opacity-50 cursor-not-allowed bg-slate-700/30"
            }`}
          >
            <AiOutlinePlus size={20} color="white" className="mr-3" />
            <div className="text-white text-sm">Scan New File</div>
          </button>
        )}

        {}
        {}
        {isCollapsed ? (
          <Tooltip content="Get in Touch" placement="right">
            <a
              href="mailto:info@ai-spy.xyz"
              className={`flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl`}
            >
              <BiMessageDetail size={20} color="white" />
            </a>
          </Tooltip>
        ) : (
          <a
            href="mailto:info@ai-spy.xyz"
            className={`flex flex-row items-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl`}
          >
            <BiMessageDetail size={20} color="white" className="mr-3" />
            <div className="text-white text-sm">Get in Touch</div>
          </a>
        )}

        {}
        {isSignedIn && (
          <>
            {isCollapsed ? (
              <Tooltip content="Refresh Subscription" placement="right">
                <button
                  onClick={refreshSubscription}
                  className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl"
                >
                  <RiRefreshLine size={20} color="white" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={refreshSubscription}
                className="flex flex-row items-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl"
              >
                <RiRefreshLine size={20} color="white" className="mr-3" />
                <div className="text-white text-sm">Refresh Status</div>
              </button>
            )}
          </>
        )}

        {}
        {isSignedIn && (
          <>
            {isCollapsed ? (
              <Tooltip content="My Account" placement="right">
                <Link
                  href="/billing"
                  className={`flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl ${currentPath === "/billing" && "bg-slate-700"}`}
                >
                  <RiUserLine size={20} color="white" />
                </Link>
              </Tooltip>
            ) : (
              <Link
                href="/billing"
                className={`flex flex-row items-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl ${currentPath === "/billing" && "bg-slate-700"}`}
              >
                <RiUserLine size={20} color="white" className="mr-3" />
                <div className="text-white text-sm">My Account</div>
              </Link>
            )}
          </>
        )}
      </div>
      <div className="mt-auto">
        {!isCollapsed && (
          <div className="flex-col justify-center items-center text-slate-300 text-xs p-4">
            <p className="">
              Ai-SPY can make mistakes, so double check results.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Not trained to detect AI-generated music, only speech.
            </p>
          </div>
        )}

        {}
        {isSignedIn ? (
          <>
            {isCollapsed
              ? subscriptionStatusComponentCollapsed
              : subscriptionStatusComponent}
            {isLoading &&
              (isCollapsed
                ? loadingSpinnerComponentCollapsed
                : loadingSpinnerComponent)}
            {isCollapsed
              ? subscribeButtonComponentCollapsed
              : subscribeButtonComponent}
          </>
        ) : (
          <>
            {isCollapsed
              ? upgradeButtonForGuestsComponentCollapsed
              : upgradeButtonForGuestsComponent}
          </>
        )}

        {isSignedIn ? (
          <>
            {isCollapsed ? (
              <Tooltip content="Sign Out" placement="right">
                <button
                  onClick={handleSignOut}
                  className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl"
                >
                  <RiLogoutBoxLine size={20} color="white" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={handleSignOut}
                className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2"
              >
                <RiLogoutBoxLine size={20} color="white" className="mr-3" />
                <div className="text-white text-sm">Sign Out</div>
              </button>
            )}
          </>
        ) : (
          <>
            {isCollapsed ? (
              <Tooltip content="Sign In" placement="right">
                <a
                  href="https://accounts.ai-spy.xyz/sign-in"
                  className="flex flex-row items-center justify-center mb-1 w-full px-4 py-4 hover:bg-slate-700 rounded-2xl"
                >
                  <RiLoginBoxLine size={20} color="white" />
                </a>
              </Tooltip>
            ) : (
              <a
                href="https://accounts.ai-spy.xyz/sign-in"
                className="flex flex-row items-center w-full px-4 py-4 hover:bg-slate-700 rounded-2xl mb-2"
              >
                <RiLoginBoxLine size={20} color="white" className="mr-3" />
                <div className="text-white text-sm">Sign In</div>
              </a>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
