# Passport KYC Micro-Frontend

This is the Passport document upload micro-frontend for the KYC platform.

## Setup

```sh
npm install
npm start
```

## Integration
- Exposes the `PassportKyc` component via Module Federation.
- To be consumed by the KYC Dashboard Shell.

## Module Federation (Webpack) Example

```
const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config
  plugins: [
    new ModuleFederationPlugin({
      name: "passportKyc",
      filename: "remoteEntry.js",
      exposes: {
        "./PassportKyc": "./src/PassportKyc",
      },
      shared: ["react", "react-dom", "styled-components"],
    }),
  ],
};
```
