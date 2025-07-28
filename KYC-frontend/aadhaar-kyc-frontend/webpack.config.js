const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config (merge with CRA config using craco or customize-cra)
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
