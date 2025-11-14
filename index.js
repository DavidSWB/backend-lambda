// index.js - ESTE ES EL HANDLER DE TU AWS LAMBDA (index.handler)

import serverless from "serverless-http";

// Importa la funcion 'createServer' desde el código compilado.
// production.mjs es el nombre de archivo definido en vite.config.server.ts
import { createServer } from "./server/production.mjs"; 

export const handler = serverless(createServer());