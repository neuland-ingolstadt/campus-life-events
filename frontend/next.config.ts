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
		return [];
	},
	output: "standalone",
	cacheComponents: true,
	experimental: {
		webpackMemoryOptimizations: true,
		staleTimes: {
			dynamic: 30,
			static: 180,
		},
	},
	reactCompiler: false,
	poweredByHeader: false,
};

export default nextConfig;
