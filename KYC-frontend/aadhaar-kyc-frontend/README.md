# Aadhaar KYC Micro-Frontend

This is the Aadhaar OTP verification micro-frontend for the KYC platform.

## Setup

```sh
npm install
npm start
```

## Integration
- Exposes the `AadhaarOtp` component via Module Federation.
- To be consumed by the KYC Dashboard Shell.

## Module Federation (Webpack) Example

```
const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config
  plugins: [
    new ModuleFederationPlugin({
      name: "aadhaarKyc",
      filename: "remoteEntry.js",
      exposes: {
        "./AadhaarOtp": "./src/AadhaarOtp",
      },
      shared: ["react", "react-dom", "styled-components"],
    }),
  ],
};
```
