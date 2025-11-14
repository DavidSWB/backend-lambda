// index.js - Handler de Lambda

import serverless from "serverless-http";

// Apunta al archivo compilado que realmente existe: node-build.mjs
import { createServer } from "./server/node-build.mjs"; 

export const handler = serverless(createServer());