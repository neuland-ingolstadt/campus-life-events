import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
	input: "http://localhost:8080/api/api-docs/openapi.json",
	output: "client",
});
