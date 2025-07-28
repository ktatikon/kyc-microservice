const { ModuleFederationPlugin } = require("@module-federation/webpack-module-federation-plugin");

module.exports = {
  // ...other config (merge with CRA config using craco or customize-cra)
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
