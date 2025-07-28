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
  color: #f57c00;
  margin-bottom: 1rem;
`;

export default function AadhaarOtp({ onSuccess }) {
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryDelay, setRetryDelay] = useState(0);
  const retryTimeout = useRef(null);
  const [retryCount, setRetryCount] = useState(0);

  // Simulate sending OTP
  const sendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setSuccess("OTP sent to your registered mobile number.");
    }, 1000);
  };

  // Simulate verifying OTP
  const verifyOtp = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      setLoading(false);
      if (otp === "123456") {
        setSuccess("Aadhaar OTP verified successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        setError("Invalid OTP. Please try again.");
        setRetryCount(c => c + 1);
        if (retryCount >= 2) {
          setRetryDelay(10 * Math.pow(2, retryCount - 2));
          retryTimeout.current = setTimeout(() => setRetryDelay(0), 1000 * 10 * Math.pow(2, retryCount - 2));
        }
      }
    }, 1000);
  };

  // Cleanup retry timeout on unmount
  React.useEffect(() => {
    return () => clearTimeout(retryTimeout.current);
  }, []);

  return (
    <OtpContainer>
      <OtpTitle>Aadhaar OTP Verification</OtpTitle>
      {error && <OtpError>{error}</OtpError>}
      {success && <OtpSuccess>{success}</OtpSuccess>}
      {step === 1 ? (
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
