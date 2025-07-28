import React, { useState } from "react";
import styled from "styled-components";

const PanContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
`;
const PanTitle = styled.h2`
  margin-bottom: 1rem;
`;
const PanInput = styled.input`
  width: 100%;
  padding: 0.7rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
`;
const PanButton = styled.button`
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
const PanError = styled.div`
  color: #d32f2f;
  margin-bottom: 1rem;
`;
const PanSuccess = styled.div`
  color: #388e3c;
  margin-bottom: 1rem;
`;

export default function PanKyc({ onSuccess }) {
  const [pan, setPan] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setError("");
    setSuccess("");
  };

  const handleUpload = () => {
    if (!file) {
      setError("Please select a PAN document to upload.");
      return;
    }
    setSuccess("PAN document uploaded successfully!");
    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1000);
  };

  return (
    <PanContainer>
      <PanTitle>PAN KYC Upload</PanTitle>
      {error && <PanError>{error}</PanError>}
      {success && <PanSuccess>{success}</PanSuccess>}
      <PanInput
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />
      <PanButton onClick={handleUpload} disabled={!file}>
        Upload PAN
      </PanButton>
    </PanContainer>
  );
}
