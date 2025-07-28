import React from "react";

import styled, { createGlobalStyle } from "styled-components";
import KycDashboard from "./components/KycDashboard";

const GlobalStyle = createGlobalStyle`
  body {
    background: #f6f8fa;
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
`;

function App() {
  return (
    <>
      <GlobalStyle />
      <KycDashboard />
    </>
  );
}

export default App;
