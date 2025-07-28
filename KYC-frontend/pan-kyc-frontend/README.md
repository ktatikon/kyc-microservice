# PAN KYC Micro-Frontend

This is the PAN document upload micro-frontend for the KYC platform.

## Setup

```sh
npm install
npm start
```

## Integration
- Exposes the `PanKyc` component via Module Federation.
- To be consumed by the KYC Dashboard Shell.

## Module Federation (Webpack) Example

```
const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config
  plugins: [
    new ModuleFederationPlugin({
      name: "panKyc",
      filename: "remoteEntry.js",
      exposes: {
        "./PanKyc": "./src/PanKyc",
      },
      shared: ["react", "react-dom", "styled-components"],
    }),
  ],
};
```
