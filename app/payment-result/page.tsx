'use client';
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import React, { Suspense } from "react";

// Separate component for the payment result content
const PaymentResultContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const paymentMethod = searchParams.get("paymentMethod");

  const message =
    status === "success"
      ? "Payment Successful!"
      : status === "failure"
      ? "Payment Failed!" 
      : "Unknown Payment Status";

  const currency =
    paymentMethod === "TON"
      ? "TON"
      : paymentMethod === "Stars"
      ? "Stars"
      : "USD";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#6a0dad",
          color: "#fff",
          borderRadius: "10px",
          padding: "20px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "10px",
          }}
        >
          SmartSnail Purchase
        </h1>
        <h2
          style={{
            color: status === "success" ? "#32cd32" : "#ff4500",
            fontWeight: "bold",
          }}
        >
          {message}
        </h2>
        {status === "success" && (
          <div>
            <p>Order ID: {orderId}</p>
            <p>
              Amount Paid: {amount} {currency}
            </p>
          </div>
        )}
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#a020f0",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            transition: "background-color 0.3s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#8b008b")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#a020f0")}
        >
          Go to game
        </button>
      </div>
    </div>
  );
};

// Main page component
const PaymentResultPage = () => {
  return (
    <Suspense fallback={<div>Loading..</div>}>
      <PaymentResultContent />
    </Suspense>
  );
};


export default PaymentResultPage;