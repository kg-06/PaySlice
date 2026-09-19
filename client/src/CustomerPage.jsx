import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const rupeesToPaise = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.round(number * 100);
};

const formatRupees = (paise) => {
  return (paise / 100).toFixed(2);
};

function CustomerPage() {
  const qrId = window.location.pathname
    .split("/pay/")[1];

  const [merchant, setMerchant] = useState(null);

  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [paymentIndex, setPaymentIndex] = useState(0);

  const [paymentStarted, setPaymentStarted] =
    useState(false);

  const [openingPayment, setOpeningPayment] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  useEffect(() => {
    const fetchMerchant = async () => {
      if (!qrId) {
        setError("Invalid payment QR");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/merchants/${qrId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load merchant"
          );
        }

        setMerchant(data);
      } catch (err) {
        console.error(
          "Merchant fetch error:",
          err
        );

        setError(
          err.message ||
            "Unable to load payment details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMerchant();
  }, [qrId]);

  const chunks = useMemo(() => {
    if (!merchant || !amount) {
      return [];
    }

    const totalPaise =
      rupeesToPaise(amount);

    const maxChunkPaise =
      rupeesToPaise(merchant.maxChunk);

    if (
      totalPaise <= 0 ||
      maxChunkPaise <= 0
    ) {
      return [];
    }

    const result = [];

    let remaining = totalPaise;

    while (remaining > 0) {
      const chunk = Math.min(
        remaining,
        maxChunkPaise
      );

      result.push(chunk);

      remaining -= chunk;
    }

    return result;
  }, [merchant, amount]);

  const currentChunk =
    chunks[paymentIndex];

  const totalPaise =
    rupeesToPaise(amount);

  const allPaymentsCompleted =
    chunks.length > 0 &&
    paymentIndex >= chunks.length;

  const openUPIPayment = () => {
    if (
      !merchant ||
      !currentChunk ||
      openingPayment ||
      allPaymentsCompleted
    ) {
      return;
    }

    const amountInRupees =
      formatRupees(currentChunk);

    const transactionReference =
      `PS${Date.now()}${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const params = new URLSearchParams({
      pa: merchant.upiId,
      pn: merchant.merchantName,
      mc: merchant.mcc,
      tr: transactionReference,
      tn: `PaySlice payment ${
        paymentIndex + 1
      }`,
      am: amountInRupees,
      cu: "INR",
    });

    const upiUrl =
      `upi://pay?${params.toString()}`;

    console.log(
      "Generated UPI Intent:",
      upiUrl
    );

    setOpeningPayment(true);
    setPaymentStarted(true);

    setTimeout(() => {
      window.location.href = upiUrl;

      setTimeout(() => {
        setOpeningPayment(false);
      }, 1500);
    }, 100);
  };

  const confirmPayment = () => {
    if (!paymentStarted) {
      return;
    }

    if (
      paymentIndex ===
      chunks.length - 1
    ) {
      setPaymentIndex(
        paymentIndex + 1
      );

      setCompleted(true);

      return;
    }

    setPaymentIndex(
      paymentIndex + 1
    );

    setPaymentStarted(false);
  };

  const retryPayment = () => {
    setPaymentStarted(false);
    setOpeningPayment(false);
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;

    if (
      value === "" ||
      /^\d*\.?\d{0,2}$/.test(value)
    ) {
      setAmount(value);

      setPaymentIndex(0);
      setPaymentStarted(false);
      setOpeningPayment(false);
      setCompleted(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-page">
        <div className="customer-card">
          <div className="customer-brand">
            <div className="customer-brand-icon">
              P
            </div>

            <span>PaySlice</span>
          </div>

          <div className="customer-loading">
            Loading payment details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="customer-page">
        <div className="customer-card">
          <div className="customer-brand">
            <div className="customer-brand-icon">
              P
            </div>

            <span>PaySlice</span>
          </div>

          <div className="customer-error">
            <div className="customer-error-icon">
              !
            </div>

            <h1>
              Payment QR unavailable
            </h1>

            <p>
              {error ||
                "This payment QR is invalid or inactive."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="customer-page">
        <div className="customer-card">
          <div className="customer-brand">
            <div className="customer-brand-icon">
              P
            </div>

            <span>PaySlice</span>
          </div>

          <div className="merchant-info">
            <p className="merchant-label">
              PAYMENT COMPLETE
            </p>

            <h1>
              ₹{formatRupees(totalPaise)}
            </h1>

            <p className="merchant-upi">
              All payments have been
              completed.
            </p>
          </div>

          <div className="customer-breakdown">
            <div className="breakdown-header">
              <h2>
                Payment breakdown
              </h2>

              <span>
                {chunks.length}{" "}
                {chunks.length === 1
                  ? "payment"
                  : "payments"}
              </span>
            </div>

            <div className="chunk-list">
              {chunks.map(
                (chunk, index) => (
                  <div
                    className="customer-chunk completed-chunk"
                    key={index}
                  >
                    <div className="chunk-status">
                      <span className="chunk-check">
                        ✓
                      </span>

                      <span>
                        Payment {index + 1}
                      </span>
                    </div>

                    <strong>
                      ₹
                      {formatRupees(
                        chunk
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>

            <div className="customer-total">
              <span>
                Total paid
              </span>

              <strong>
                ₹
                {formatRupees(
                  totalPaise
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <div className="customer-card">
        <div className="customer-brand">
          <div className="customer-brand-icon">
            P
          </div>

          <span>PaySlice</span>
        </div>

        <div className="merchant-info">
          <p className="merchant-label">
            PAYING TO
          </p>

          <h1>
            {merchant.merchantName}
          </h1>

          <p className="merchant-upi">
            {merchant.upiId}
          </p>
        </div>

        <div className="customer-divider" />

        <div className="amount-section">
          <label htmlFor="amount">
            Enter amount
          </label>

          <div className="customer-amount-input">
            <span>₹</span>

            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={
                handleAmountChange
              }
              disabled={paymentStarted}
            />
          </div>
        </div>

        {chunks.length > 0 && (
          <div className="customer-breakdown">
            <div className="breakdown-header">
              <h2>
                Payment breakdown
              </h2>

              <span>
                Max ₹
                {Number(
                  merchant.maxChunk
                ).toFixed(2)}
                {" "}per payment
              </span>
            </div>

            <div className="chunk-list">
              {chunks.map(
                (chunk, index) => {
                  const isCompleted =
                    index < paymentIndex;

                  const isCurrent =
                    index === paymentIndex;

                  return (
                    <div
                      className={`customer-chunk ${
                        isCompleted
                          ? "completed-chunk"
                          : ""
                      } ${
                        isCurrent
                          ? "current-chunk"
                          : ""
                      }`}
                      key={index}
                    >
                      <div className="chunk-status">
                        {isCompleted ? (
                          <span className="chunk-check">
                            ✓
                          </span>
                        ) : (
                          <span className="chunk-number">
                            {index + 1}
                          </span>
                        )}

                        <span>
                          Payment{" "}
                          {index + 1}
                        </span>
                      </div>

                      <div className="chunk-amount">
                        {isCompleted && (
                          <small>
                            Completed
                          </small>
                        )}

                        {isCurrent &&
                          !isCompleted && (
                            <small>
                              Current
                            </small>
                          )}

                        <strong>
                          ₹
                          {formatRupees(
                            chunk
                          )}
                        </strong>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="customer-total">
              <span>
                Total
              </span>

              <strong>
                ₹
                {formatRupees(
                  totalPaise
                )}
              </strong>
            </div>
          </div>
        )}

        {chunks.length > 0 && (
          <>
            {!paymentStarted ? (
              <button
                className="customer-primary-button"
                onClick={
                  openUPIPayment
                }
                disabled={
                  openingPayment ||
                  allPaymentsCompleted
                }
              >
                {openingPayment
                  ? "Opening UPI..."
                  : `Pay ₹${formatRupees(
                      currentChunk
                    )}`}
              </button>
            ) : (
              <div className="payment-confirmation">
                <div className="payment-confirmation-text">
                  <strong>
                    Payment{" "}
                    {paymentIndex + 1}{" "}
                    of {chunks.length}
                  </strong>

                  <span>
                    Return here after
                    completing ₹
                    {formatRupees(
                      currentChunk
                    )}{" "}
                    payment.
                  </span>
                </div>

                <button
                  className="customer-primary-button"
                  onClick={
                    confirmPayment
                  }
                >
                  I completed this payment
                </button>

                <button
                  className="customer-secondary-button"
                  onClick={
                    retryPayment
                  }
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        <p className="customer-security-note">
          PaySlice does not hold your money.
          Each payment is opened directly
          in your UPI app.
        </p>
      </div>
    </div>
  );
}

export default CustomerPage;