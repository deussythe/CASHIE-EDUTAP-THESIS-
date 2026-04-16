import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/login-page.tsx"),
	route("/pos", "routes/page.tsx"),
] satisfies RouteConfig;