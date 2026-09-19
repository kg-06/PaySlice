import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import jsQR from "jsqr";
import { Html5Qrcode } from "html5-qrcode";

import "./App.css";
import CustomerPage from "./CustomerPage";

function App() {
  const [merchantName, setMerchantName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [mcc, setMcc] = useState("");
  const [maxChunk, setMaxChunk] = useState("");

  const [paymentUrl, setPaymentUrl] = useState("");

  const [readingQR, setReadingQR] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");

  const scannerRef = useRef(null);
  const generatedQRRef = useRef(null);

  const processQRData = (data) => {
    try {
      const qrUrl = new URL(data);

      if (qrUrl.protocol !== "upi:") {
        setError(
          "This QR code is not a UPI payment QR."
        );
        return false;
      }

      const detectedUpiId =
        qrUrl.searchParams.get("pa");

      const detectedMerchantName =
        qrUrl.searchParams.get("pn");

      const detectedMcc =
        qrUrl.searchParams.get("mc");

      if (!detectedUpiId) {
        setError(
          "Could not find a UPI ID in this QR code."
        );
        return false;
      }

      if (!detectedMerchantName) {
        setError(
          "Could not find the merchant name in this QR code."
        );
        return false;
      }

      if (!detectedMcc) {
        setError(
          "This merchant QR does not contain an MCC."
        );
        return false;
      }

      setUpiId(detectedUpiId);
      setMerchantName(detectedMerchantName);
      setMcc(detectedMcc);
      setError("");

      return true;
    } catch (error) {
      console.error(
        "QR parsing error:",
        error
      );

      setError("Invalid UPI QR format.");
      return false;
    }
  };

  const readMerchantQR = (file) => {
    if (!file) {
      return;
    }

    setReadingQR(true);
    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas =
          document.createElement("canvas");

        const context =
          canvas.getContext("2d");

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(
          image,
          0,
          0,
          image.width,
          image.height
        );

        const imageData =
          context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

        const result = jsQR(
          imageData.data,
          imageData.width,
          imageData.height
        );

        if (!result) {
          setError(
            "Could not detect a QR code in this image."
          );

          setReadingQR(false);

          return;
        }

        processQRData(result.data);

        setReadingQR(false);
      };

      image.onerror = () => {
        setError(
          "Could not load the selected image."
        );

        setReadingQR(false);
      };

      image.src = reader.result;
    };

    reader.onerror = () => {
      setError(
        "Could not read the selected image."
      );

      setReadingQR(false);
    };

    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setError("");
    setCameraActive(true);

    setTimeout(async () => {
      try {
        const scanner =
          new Html5Qrcode("qr-reader");

        scannerRef.current = scanner;

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            const success =
              processQRData(decodedText);

            if (success) {
              await stopCamera();
            }
          },
          () => {
            // Ignore individual scan failures.
          }
        );
      } catch (error) {
        console.error(
          "Camera start failed:",
          error
        );

        setCameraActive(false);

        setError(
          "Could not access the camera. Please allow camera permission or upload a QR image instead."
        );
      }
    }, 100);
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();

        await scannerRef.current.clear();

        scannerRef.current = null;
      }
    } catch (error) {
      console.error(
        "Camera stop error:",
        error
      );
    }

    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  const generateQR = async (e) => {
    e.preventDefault();

    setError("");

    if (!merchantName || !upiId || !mcc) {
      setError(
        "Please scan or upload a valid merchant QR first."
      );

      return;
    }

    if (
      !maxChunk ||
      Number(maxChunk) <= 0
    ) {
      setError(
        "Please enter a valid maximum payment chunk."
      );

      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/merchants`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            merchantName,
            upiId,
            mcc,
            maxChunk: Number(maxChunk),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to create merchant."
        );

        return;
      }

      const customerUrl =
        `${window.location.origin}/pay/${data.qrId}`;

      setPaymentUrl(customerUrl);
    } catch (error) {
      console.error(
        "Merchant creation failed:",
        error
      );

      setError(
        "Could not connect to the server."
      );
    }
  };

  const downloadQR = () => {
    const canvas =
      generatedQRRef.current;

    if (!canvas) {
      return;
    }

    const pngUrl =
      canvas.toDataURL("image/png");

    const link =
      document.createElement("a");

    link.href = pngUrl;

    link.download =
      "payslice-merchant-qr.png";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div className="app">
      <main className="merchant-container">
        <section className="merchant-card">

          <header className="brand">
            <div className="brand-icon">
              ₹
            </div>

            <div className="brand-copy">
              <h1>PaySlice</h1>

              <p>
                Split large UPI payments into
                smaller payments.
              </p>
            </div>
          </header>

          {/* Step 1 */}

          <div className="section">

            <div className="section-heading">

              <div className="heading-main">
                <span className="step-number">
                  1
                </span>

                <h2>
                  Connect your merchant QR
                </h2>
              </div>

              <p>
                Use the QR you already use
                to receive UPI payments.
              </p>

            </div>

            {!cameraActive && (
              <div className="qr-actions">

                <label className="qr-action">
                  <span className="action-icon">
                    ↑
                  </span>

                  <span className="action-content">
                    <strong>
                      Upload QR
                    </strong>

                    <small>
                      Choose an image
                    </small>
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readMerchantQR(
                        e.target.files[0]
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  className="qr-action"
                  onClick={startCamera}
                >
                  <span className="action-icon">
                    ⌁
                  </span>

                  <span className="action-content">
                    <strong>
                      Use Camera
                    </strong>

                    <small>
                      Scan your QR
                    </small>
                  </span>
                </button>

              </div>
            )}

            {cameraActive && (
              <div className="camera-container">

                <div
                  id="qr-reader"
                  className="qr-reader"
                />

                <button
                  type="button"
                  className="secondary-button"
                  onClick={stopCamera}
                >
                  Cancel scanning
                </button>

              </div>
            )}

            {readingQR && (
              <div className="status-box">
                Reading QR code...
              </div>
            )}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {merchantName &&
              upiId &&
              mcc && (
                <div className="merchant-preview">

                  <div className="preview-header">
                    <span className="success-dot" />

                    <strong>
                      Merchant detected
                    </strong>
                  </div>

                  <div className="preview-row">
                    <span>
                      Business
                    </span>

                    <strong>
                      {merchantName}
                    </strong>
                  </div>

                  <div className="preview-row">
                    <span>
                      UPI ID
                    </span>

                    <strong>
                      {upiId}
                    </strong>
                  </div>

                  <div className="preview-row">
                    <span>
                      Category
                    </span>

                    <strong>
                      MCC {mcc}
                    </strong>
                  </div>

                </div>
              )}
          </div>

          {/* Step 2 */}

          <div className="section">

            <div className="section-heading">

              <div className="heading-main">
                <span className="step-number">
                  2
                </span>

                <h2>
                  Set payment limit
                </h2>
              </div>

              <p>
                No individual payment will
                exceed this amount.
              </p>

            </div>

            <div className="amount-input">
              <span>₹</span>

              <input
                type="number"
                min="1"
                placeholder="1999"
                value={maxChunk}
                onChange={(e) =>
                  setMaxChunk(
                    e.target.value
                  )
                }
              />
            </div>

          </div>

          <button
            className="primary-button"
            type="button"
            onClick={generateQR}
            disabled={
              !merchantName ||
              !upiId ||
              !mcc ||
              !maxChunk
            }
          >
            Create Payment QR
          </button>

          {paymentUrl && (
            <div className="generated-section">

              <div className="generated-header">
                <span className="success-label">
                  READY
                </span>

                <h2>
                  Your payment QR is ready
                </h2>

                <p>
                  Customers can scan this QR
                  to start paying.
                </p>
              </div>

              <div
                className="generated-qr"
              >
                <QRCodeCanvas
                  ref={generatedQRRef}
                  value={paymentUrl}
                  size={240}
                  level="M"
                  includeMargin
                />
              </div>

              <button
                type="button"
                className="download-button"
                onClick={downloadQR}
              >
                ↓ Download QR
              </button>

              <div className="url-box">
                {paymentUrl}
              </div>

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

function Root() {
  const path =
    window.location.pathname;

  if (path.startsWith("/pay/")) {
    return <CustomerPage />;
  }

  return <App />;
}

export default Root;