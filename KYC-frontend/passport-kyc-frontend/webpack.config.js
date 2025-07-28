const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config (merge with CRA config using craco or customize-cra)
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
