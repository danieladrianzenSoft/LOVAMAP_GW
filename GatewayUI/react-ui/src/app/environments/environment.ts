import { Environment } from "./environment.d";

let environment: Environment;

if (process.env.NODE_ENV === "production") {
    environment = require("./environment.production").default as Environment;
} else {
    environment = require("./environment.development").default as Environment;
}

export default environment;