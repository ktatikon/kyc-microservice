import React, { useState, useRef } from "react";
import styled from "styled-components";

const OtpContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
`;
const OtpTitle = styled.h2`
  margin-bottom: 1rem;
`;
const OtpInput = styled.input`
  width: 100%;
  padding: 0.7rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
`;
const OtpButton = styled.button`
  background: #1976d2;
  color: #fff;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
  margin-right: 1rem;
  &:disabled {
    background: #b0bec5;
    cursor: not-allowed;
  }
`;
const OtpError = styled.div`
  color: #d32f2f;
  margin-bottom: 1rem;
`;
const OtpSuccess = styled.div`
  color: #388e3c;
  margin-bottom: 1rem;
`;
const OtpRetryInfo = styled.div`
  color: #ffa726;
  margin-bottom: 1rem;
  font-size: 0.95rem;
`;

function simulateApi({ type, retryCount }) {
  // Simulate different error scenarios based on retryCount and type
  // For demo: 1st try = network error, 2nd = rate limit, 3rd = success
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (type === "sendOtp") {
        if (retryCount === 0) {
          reject({ errorType: "network", message: "Network error. Please check your connection." });
        } else if (retryCount === 1) {
          reject({ errorType: "rate_limit", message: "Too many requests. Please wait and try again." });
        } else {
          resolve({ success: true });
        }
      } else if (type === "verifyOtp") {
        if (retryCount === 0) {
          reject({ errorType: "server", message: "Server error. Please try again later." });
        } else if (retryCount === 1) {
          reject({ errorType: "mock_mode", message: "System in mock mode. Using fallback." });
        } else {
          resolve({ success: true });
        }
      }
    }, 1000);
  });
}

function AadhaarOtp({ onKycSuccess }) {
  const [aadhaar, setAadhaar] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const retryTimeout = useRef(null);
  const [errorType, setErrorType] = useState(null);

  // Exponential backoff retry logic
  const handleRetry = (action) => {
    const delay = Math.min(2000 * Math.pow(2, retryCount), 10000); // max 10s
    setRetryDelay(delay / 1000);
    setLoading(true);
    retryTimeout.current = setTimeout(() => {
      setRetryCount(retryCount + 1);
      setRetryDelay(0);
      action();
    }, delay);
  };

  const sendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    setErrorType(null);
    try {
      await simulateApi({ type: "sendOtp", retryCount });
      setOtpSent(true);
      setSuccess("OTP sent to your registered mobile number.");
      setLoading(false);
      setRetryCount(0);
    } catch (e) {
      setError(e.message);
      setErrorType(e.errorType);
      setLoading(false);
      if (e.errorType === "network" || e.errorType === "rate_limit") {
        handleRetry(sendOtp);
      }
    }
  };

  const verifyOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    setErrorType(null);
    if (otp !== "123456") {
      setError("Invalid OTP. Please try again.");
      setLoading(false);
      return;
    }
    try {
      await simulateApi({ type: "verifyOtp", retryCount });
      setSuccess("KYC Verified Successfully!");
      setLoading(false);
      setRetryCount(0);
      if (onKycSuccess) onKycSuccess();
    } catch (e) {
      setError(e.message);
      setErrorType(e.errorType);
      setLoading(false);
      if (e.errorType === "server" || e.errorType === "mock_mode") {
        handleRetry(verifyOtp);
      }
    }
  };

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  return (
    <OtpContainer>
      <OtpTitle>Aadhaar OTP Verification</OtpTitle>
      {error && <OtpError>{error}</OtpError>}
      {success && <OtpSuccess>{success}</OtpSuccess>}
      {!otpSent ? (
        <>
          <OtpInput
            type="text"
            value={aadhaar}
            onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Enter your 12-digit Aadhaar number"
            disabled={loading || retryDelay > 0}
          />
          <OtpButton
            onClick={sendOtp}
            disabled={aadhaar.length !== 12 || loading || retryDelay > 0}
          >
            {loading ? "Sending..." : "Send OTP"}
          </OtpButton>
        </>
      ) : (
        <>
          <OtpInput
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            disabled={loading || retryDelay > 0}
          />
          <OtpButton
            onClick={verifyOtp}
            disabled={otp.length !== 6 || loading || retryDelay > 0}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </OtpButton>
        </>
      )}
      {retryDelay > 0 && (
        <OtpRetryInfo>
          Too many failed attempts. Please wait {retryDelay} seconds before retrying.
        </OtpRetryInfo>
      )}
    </OtpContainer>
  );
}

export default AadhaarOtp;
