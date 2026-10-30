import { execFileSync, spawn } from "node:child_process";

const port = process.argv[2] ?? "4310";
execFileSync("supabase", ["start"], { stdio: "inherit" });
const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }));
const url = status.API_URL;
const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

if (typeof url !== "string" || typeof publishableKey !== "string") {
  throw new Error("Supabase local status is missing API credentials");
}

execFileSync("supabase", ["db", "reset", "--yes"], { stdio: "inherit" });

const server = spawn("pnpm", ["exec", "next", "dev", "--port", port], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    ...(typeof secretKey === "string" ? { SUPABASE_SECRET_KEY: secretKey } : {}),
  },
  stdio: "inherit",
});

const stop = (signal) => server.kill(signal);
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
