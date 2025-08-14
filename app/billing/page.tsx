"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiIdCardLine,
  RiCalendarLine,
  RiDownloadLine,
  RiCloseLine,
  RiCheckLine,
  RiRestartLine,
} from "react-icons/ri";
import { MdCancel } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import BillingToast from "../components/BillingToast";

interface Invoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  number: string | null;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  created: number;
  items: Array<{
    price: {
      id: string;
      unit_amount: number;
      currency: string;
      recurring: {
        interval: string;
        interval_count: number;
      };
    };
  }>;
}

interface Customer {
  id: string;
  email: string;
  created: number;
}

interface BillingData {
  invoices: Invoice[];
  subscriptions: Subscription[];
  customer: Customer;
}

export default function BillingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchBillingData();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const fetchBillingData = async () => {
    try {
      const response = await fetch("/api/billing-history");

      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      } else {
        const errorData = await response.json();
        setError(
          `Failed to fetch billing data: ${errorData.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      setError(`Failed to fetch billing data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.",
      )
    ) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
      });

      const responseData = await response.json();

      if (response.ok) {
        await fetchBillingData();
        setToast({
          message:
            "Subscription cancelled successfully. You will continue to have access until the end of your current billing period.",
          type: "success",
        });
      } else {
        setToast({
          message:
            responseData.error ||
            responseData.details ||
            "Failed to cancel subscription",
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `Failed to cancel subscription: ${error.message}`,
        type: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to reactivate your subscription? This will continue your billing cycle.",
      )
    ) {
      return;
    }

    setReactivating(true);
    try {
      const response = await fetch("/api/reactivate-subscription", {
        method: "POST",
      });

      const responseData = await response.json();

      if (response.ok) {
        await fetchBillingData();
        setToast({
          message:
            "Subscription reactivated successfully! Your billing will continue as normal.",
          type: "success",
        });
      } else {
        setToast({
          message:
            responseData.error ||
            responseData.details ||
            "Failed to reactivate subscription",
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `Failed to reactivate subscription: ${error.message}`,
        type: "error",
      });
    } finally {
      setReactivating(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp === 0 || isNaN(timestamp)) {
      return "Invalid Date";
    }

    try {
      const date = new Date(timestamp * 1000);

      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "active":
        return "text-green-400";
      case "pending":
        return "text-yellow-400";
      case "canceled":
      case "cancelled":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "active":
        return <RiCheckLine className="w-4 h-4" />;
      case "canceled":
      case "cancelled":
        return <RiCloseLine className="w-4 h-4" />;
      default:
        return <RiCalendarLine className="w-4 h-4" />;
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="mb-4">
            You need to be signed in to view your billing information.
          </p>
          <a
            href="https://accounts.ai-spy.xyz/sign-in"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const activeSubscription = billingData?.subscriptions.find(
    (sub) => sub.status === "active",
  );
  const hasActiveSubscription = !!activeSubscription;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RiArrowLeftLine className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Billing Overview</h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaCrown className="w-5 h-5 mr-2 text-amber-400" />
              Subscription Status
            </h2>
            {hasActiveSubscription && (
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm flex items-center">
                <RiCheckLine className="w-4 h-4 mr-1" />
                Active
              </span>
            )}
          </div>

          {hasActiveSubscription && activeSubscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Plan</p>
                  <p className="text-lg font-semibold">AI-SPY Pro</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Amount</p>
                  <p className="text-lg font-semibold">
                    {activeSubscription.items[0] &&
                      formatCurrency(
                        activeSubscription.items[0].price.unit_amount,
                        activeSubscription.items[0].price.currency,
                      )}{" "}
                    / {activeSubscription.items[0]?.price.recurring.interval}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Next Billing Date</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      if (
                        !activeSubscription.current_period_end ||
                        activeSubscription.current_period_end === 0
                      ) {
                        if (
                          activeSubscription.current_period_start &&
                          activeSubscription.items[0]?.price.recurring
                            .interval === "month"
                        ) {
                          const startDate = new Date(
                            activeSubscription.current_period_start * 1000,
                          );
                          const calculatedEnd = new Date(
                            startDate.getFullYear(),
                            startDate.getMonth() + 1,
                            startDate.getDate(),
                          );
                          return calculatedEnd.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          });
                        }
                        return <span className="text-amber-400">Pending</span>;
                      }

                      const formattedDate = formatDate(
                        activeSubscription.current_period_end,
                      );
                      return formattedDate === "Invalid Date" ? (
                        <span className="text-amber-400">Pending</span>
                      ) : (
                        formattedDate
                      );
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Status</p>
                  <p
                    className={`text-lg font-semibold flex items-center ${getStatusColor(activeSubscription.status)}`}
                  >
                    {getStatusIcon(activeSubscription.status)}
                    <span className="ml-1 capitalize">
                      {activeSubscription.status}
                    </span>
                  </p>
                </div>
              </div>

              {activeSubscription.cancel_at_period_end && (
                <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
                  <p className="text-orange-300 mb-3">
                    <strong>Subscription Cancellation Scheduled:</strong> Your
                    subscription will end on{" "}
                    {(() => {
                      const formattedDate = formatDate(
                        activeSubscription.current_period_end,
                      );
                      return formattedDate === "Invalid Date"
                        ? "your current period end date"
                        : formattedDate;
                    })()}
                    . You will continue to have access until then.
                  </p>
                  <p className="text-orange-200 text-sm">
                    Changed your mind? You can reactivate your subscription to
                    continue billing as normal.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                {!activeSubscription.cancel_at_period_end ? (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <MdCancel className="w-4 h-4 mr-2" />
                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                ) : (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={reactivating}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <RiRestartLine className="w-4 h-4 mr-2" />
                    {reactivating
                      ? "Reactivating..."
                      : "Reactivate Subscription"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-slate-700/50 rounded-lg p-6 max-w-md mx-auto">
                <FaCrown className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-4">
                  You don&apos;t have an active subscription.
                </p>
                <Link
                  href="/subscribe"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-lg inline-flex items-center transition-colors"
                >
                  <FaCrown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <RiIdCardLine className="w-5 h-5 mr-2" />
            Billing History
          </h2>

          {billingData?.invoices.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">Invoice</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Period</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">
                          {invoice.number || invoice.id.substring(0, 8)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          if (!invoice.period_start && !invoice.period_end) {
                            return "-";
                          }

                          const startDate = invoice.period_start
                            ? formatDate(invoice.period_start)
                            : null;
                          const endDate = invoice.period_end
                            ? formatDate(invoice.period_end)
                            : null;

                          if (
                            startDate &&
                            (!endDate || startDate === endDate)
                          ) {
                            if (invoice.period_start) {
                              const start = new Date(
                                invoice.period_start * 1000,
                              );
                              const calculatedEnd = new Date(
                                start.getFullYear(),
                                start.getMonth() + 1,
                                start.getDate(),
                              );
                              return (
                                <span className="text-sm">
                                  {startDate} -{" "}
                                  {calculatedEnd.toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              );
                            }
                          }

                          if (startDate && endDate && startDate !== endDate) {
                            return (
                              <span className="text-sm">
                                {startDate} - {endDate}
                              </span>
                            );
                          }

                          return startDate || endDate || "-";
                        })()}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`flex items-center ${getStatusColor(invoice.status)}`}
                        >
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1 capitalize">
                            {invoice.status}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center text-sm"
                          >
                            <RiDownloadLine className="w-4 h-4 mr-1" />
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <RiIdCardLine className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300">No billing history available.</p>
              <p className="text-slate-400 text-sm mt-2">
                Your invoices will appear here after your first payment.
              </p>
            </div>
          )}
        </div>
      </div>

      {}
      {toast && (
        <BillingToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
