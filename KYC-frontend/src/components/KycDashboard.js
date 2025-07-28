import React, { useState } from "react";
import styled from "styled-components";
import AadhaarOtp from "./AadhaarOtp";

const DashboardContainer = styled.div`
  max-width: 650px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
`;
const DashboardTitle = styled.h2`
  margin-bottom: 1rem;
`;
const DashboardStatus = styled.div`
  font-size: 1.2rem;
  margin-bottom: 1rem;
`;
const DashboardButton = styled.button`
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
const DashboardStep = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
`;
const DashboardUploadSection = styled.div`
  margin-bottom: 1rem;
`;
const DashboardUploadList = styled.ul`
  list-style: none;
  padding: 0;
`;
const DashboardUploadItem = styled.li`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;
const DashboardFileName = styled.span`
  margin-right: 1rem;
`;
const DashboardRemoveBtn = styled.button`
  background: #d32f2f;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 0.2rem 0.6rem;
  font-size: 0.9rem;
  margin-left: 0.5rem;
  cursor: pointer;
`;
const DashboardError = styled.div`
  color: #d32f2f;
  margin-bottom: 1rem;
`;
const DashboardSuccess = styled.div`
  color: #388e3c;
  margin-bottom: 1rem;
`;

const DOC_TYPES = [
  { key: "aadhaar", label: "Aadhaar" },
  { key: "pan", label: "PAN" },
  { key: "passport", label: "Passport" }
];

export default function KycDashboard() {
  const [kycStatus, setKycStatus] = useState("Not Started");
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [uploads, setUploads] = useState({ aadhaar: [], pan: [], passport: [] });
  const [uploadErrors, setUploadErrors] = useState({ aadhaar: "", pan: "", passport: "" });

  // Handle file upload for each doc type
  const handleFileUpload = (docType, files) => {
    let error = "";
    let newUploads = [...uploads[docType]];
    for (let file of files) {
      // Check for duplicate by name and size
      if (newUploads.some(f => f.name === file.name && f.size === file.size)) {
        error = `Duplicate file: ${file.name}`;
        continue;
      }
      newUploads.push(file);
    }
    setUploads({ ...uploads, [docType]: newUploads });
    setUploadErrors({ ...uploadErrors, [docType]: error });
  };

  // Remove uploaded file
  const handleRemove = (docType, idx) => {
    const newUploads = uploads[docType].filter((_, i) => i !== idx);
    setUploads({ ...uploads, [docType]: newUploads });
  };

  // Simulate KYC verification after all docs uploaded
  const canVerify = DOC_TYPES.every(d => uploads[d.key].length > 0);

  return (
    <DashboardContainer>
      <DashboardTitle>KYC Dashboard</DashboardTitle>
      <DashboardStatus>
        <b>Status:</b> {kycStatus}
      </DashboardStatus>
      <DashboardStep>
        <b>Step 1: Aadhaar OTP KYC</b>
        <br />
        <DashboardButton onClick={() => setShowAadhaar(true)} disabled={kycStatus === "Verified" || showAadhaar}>
          Start Aadhaar OTP KYC
        </DashboardButton>
        {showAadhaar && (
          <>
            <hr />
            <AadhaarOtp onKycSuccess={() => {
              setKycStatus("Aadhaar Verified");
              setShowAadhaar(false);
            }} />
          </>
        )}
      </DashboardStep>
      <DashboardStep>
        <b>Step 2: Upload KYC Documents</b>
        {DOC_TYPES.map(doc => (
          <DashboardUploadSection key={doc.key}>
            <b>{doc.label}:</b>
            <input
              type="file"
              multiple
              onChange={e => handleFileUpload(doc.key, Array.from(e.target.files))}
              disabled={kycStatus === "Verified"}
            />
            <DashboardUploadList>
              {uploads[doc.key].map((file, idx) => (
                <DashboardUploadItem key={file.name + file.size}>
                  <DashboardFileName>{file.name}</DashboardFileName>
                  <DashboardRemoveBtn onClick={() => handleRemove(doc.key, idx)} disabled={kycStatus === "Verified"}>
                    Remove
                  </DashboardRemoveBtn>
                </DashboardUploadItem>
              ))}
            </DashboardUploadList>
            {uploadErrors[doc.key] && <DashboardError>{uploadErrors[doc.key]}</DashboardError>}
          </DashboardUploadSection>
        ))}
      </DashboardStep>
      <DashboardStep>
        <b>Step 3: Final KYC Verification</b>
        <br />
        <DashboardButton
          onClick={() => setKycStatus("Verified")}
          disabled={!canVerify || kycStatus === "Verified"}
        >
          Complete KYC
        </DashboardButton>
        {kycStatus === "Verified" && <DashboardSuccess>KYC Completed and Verified!</DashboardSuccess>}
      </DashboardStep>
    </DashboardContainer>
  );
}
