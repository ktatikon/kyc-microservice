import React, { useState } from "react";

// Placeholder imports for remote micro-frontends
// In real setup, these would be loaded via Module Federation
// import AadhaarOtp from "aadhaar-kyc-frontend/AadhaarOtp";
// import PanKyc from "pan-kyc-frontend/PanKyc";
// import PassportKyc from "passport-kyc-frontend/PassportKyc";

export default function Dashboard() {
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panUploaded, setPanUploaded] = useState(false);
  const [passportUploaded, setPassportUploaded] = useState(false);
  const [kycStatus, setKycStatus] = useState("Not Started");

  // These would be replaced by remote components
  const AadhaarOtp = () => <div>Load Aadhaar OTP Micro-Frontend here</div>;
  const PanKyc = () => <div>Load PAN KYC Micro-Frontend here</div>;
  const PassportKyc = () => <div>Load Passport KYC Micro-Frontend here</div>;

  return (
    <div style={{ maxWidth: 650, margin: "2rem auto", padding: "2rem", background: "#fff", borderRadius: 10, boxShadow: "0 2px 16px rgba(0,0,0,0.09)" }}>
      <h2>KYC Dashboard (Shell)</h2>
      <div><b>Status:</b> {kycStatus}</div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 1: Aadhaar OTP KYC</b>
        <AadhaarOtp onSuccess={() => { setAadhaarVerified(true); setKycStatus("Aadhaar Verified"); }} />
      </div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 2: PAN KYC Upload</b>
        <PanKyc onSuccess={() => { setPanUploaded(true); setKycStatus("PAN Uploaded"); }} />
      </div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 3: Passport KYC Upload</b>
        <PassportKyc onSuccess={() => { setPassportUploaded(true); setKycStatus("Passport Uploaded"); }} />
      </div>
      <div>
        <b>Final KYC Status:</b> {aadhaarVerified && panUploaded && passportUploaded ? "All Steps Complete!" : "Incomplete"}
      </div>
    </div>
  );
}
