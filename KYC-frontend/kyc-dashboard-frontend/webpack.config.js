const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config (merge with CRA config using craco or customize-cra)
  plugins: [
    new ModuleFederationPlugin({
      name: "kycDashboard",
      remotes: {
        aadhaarKyc: "aadhaarKyc@http://localhost:3000/remoteEntry.js",
        panKyc: "panKyc@http://localhost:3001/remoteEntry.js",
        passportKyc: "passportKyc@http://localhost:3002/remoteEntry.js",
      },
      shared: ["react", "react-dom", "styled-components"],
    }),
  ],
};
