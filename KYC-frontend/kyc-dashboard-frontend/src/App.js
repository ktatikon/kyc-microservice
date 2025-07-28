import React, { Suspense } from "react";

// These imports will work after Module Federation is set up and remotes are running
// const AadhaarOtp = React.lazy(() => import("aadhaarKyc/AadhaarOtp"));
// const PanKyc = React.lazy(() => import("panKyc/PanKyc"));
// const PassportKyc = React.lazy(() => import("passportKyc/PassportKyc"));

// For now, use placeholders
const AadhaarOtp = () => <div>Load Aadhaar OTP Micro-Frontend here</div>;
const PanKyc = () => <div>Load PAN KYC Micro-Frontend here</div>;
const PassportKyc = () => <div>Load Passport KYC Micro-Frontend here</div>;

function App() {
  return (
    <div style={{ maxWidth: 650, margin: "2rem auto", padding: "2rem", background: "#fff", borderRadius: 10, boxShadow: "0 2px 16px rgba(0,0,0,0.09)" }}>
      <h2>KYC Dashboard (Shell)</h2>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 1: Aadhaar OTP KYC</b>
        <AadhaarOtp />
      </div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 2: PAN KYC Upload</b>
        <PanKyc />
      </div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
        <b>Step 3: Passport KYC Upload</b>
        <PassportKyc />
      </div>
    </div>
  );
}

export default App;
