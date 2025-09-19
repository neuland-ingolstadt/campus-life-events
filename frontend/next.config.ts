import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${BACKEND_URL}/api/:path*`,
			},
		];
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
