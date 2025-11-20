// index.js - Handler de Lambda

import serverless from "serverless-http";

// Apunta al archivo compilado que realmente existe: node-build.mjs
import { createServer, connectDB } from "./server/node-build.mjs";

let _handler = null;
export const handler = async (event, context) => {
	if (!_handler) {
		// Asegurar que la BD esté conectada en el arranque del contenedor Lambda
		await connectDB();
		const app = createServer();
		_handler = serverless(app);
	}
	return _handler(event, context);
};