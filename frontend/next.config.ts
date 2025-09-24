import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const IS_DEV = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
	async rewrites() {
		if (IS_DEV) {
			return [
				{
					source: "/api/:path*",
					destination: `${BACKEND_URL}/api/:path*`,
				},
			];
		}
		// In production, let ingress handle the API routing
		return [];
	},
	output: "standalone",
	experimental: {
		webpackMemoryOptimizations: true,
		reactCompiler: false,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	poweredByHeader: false,

};

export default nextConfig;
