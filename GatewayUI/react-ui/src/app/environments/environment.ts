import { Environment } from "./environment.d";

let environment: Environment;

const env = process.env.REACT_APP_ENV || "development";

if (env === "production") {
    environment = require("./environment.production").default as Environment;
} else if (env === "test") {
    environment = require("./environment.test").default as Environment;
} else if (env === "preproduction") {
    environment = require("./environment.preproduction").default as Environment;
} else {
    environment = require("./environment.development").default as Environment;
}

export default environment;