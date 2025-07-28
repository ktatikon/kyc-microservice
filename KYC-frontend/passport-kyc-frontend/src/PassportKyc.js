import React, { useState } from "react";
import styled from "styled-components";

const PassportContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
`;
const PassportTitle = styled.h2`
  margin-bottom: 1rem;
`;
const PassportInput = styled.input`
  width: 100%;
  padding: 0.7rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
`;
const PassportButton = styled.button`
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
const PassportError = styled.div`
  color: #d32f2f;
  margin-bottom: 1rem;
`;
const PassportSuccess = styled.div`
  color: #388e3c;
  margin-bottom: 1rem;
`;

export default function PassportKyc({ onSuccess }) {
  const [passport, setPassport] = useState("");
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
      setError("Please select a Passport document to upload.");
      return;
    }
    setSuccess("Passport document uploaded successfully!");
    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1000);
  };

  return (
    <PassportContainer>
      <PassportTitle>Passport KYC Upload</PassportTitle>
      {error && <PassportError>{error}</PassportError>}
      {success && <PassportSuccess>{success}</PassportSuccess>}
      <PassportInput
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />
      <PassportButton onClick={handleUpload} disabled={!file}>
        Upload Passport
      </PassportButton>
    </PassportContainer>
  );
}
