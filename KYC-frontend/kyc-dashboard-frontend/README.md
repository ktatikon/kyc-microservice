# KYC Dashboard Shell (Micro-Frontend Host)

This is the shell/container app that loads all KYC micro-frontends (Aadhaar, PAN, Passport) using Module Federation.

## Setup

```sh
npm install
npm start
```

## Integration
- Loads remote micro-frontends at runtime using Module Federation.
- Aggregates status and orchestrates the KYC workflow.

## Module Federation (Webpack) Example

```
const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config
  plugins: [
    new ModuleFederationPlugin({
      name: "kycDashboard",
      remotes: {
        aadhaarKyc: "aadhaarKyc@http://localhost:3001/remoteEntry.js",
        panKyc: "panKyc@http://localhost:3002/remoteEntry.js",
        passportKyc: "passportKyc@http://localhost:3003/remoteEntry.js",
      },
      shared: ["react", "react-dom", "styled-components"],
    }),
  ],
};
```

## Usage Example

```
const AadhaarOtp = React.lazy(() => import("aadhaarKyc/AadhaarOtp"));
const PanKyc = React.lazy(() => import("panKyc/PanKyc"));
const PassportKyc = React.lazy(() => import("passportKyc/PassportKyc"));
```
