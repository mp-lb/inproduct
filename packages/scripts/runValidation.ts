import { runValidation } from "./validation/runValidation";

const args = process.argv.slice(2);

const usage =
  "Usage: zap t validation -- [--profile default|lint] -- <command> [args...]";

if (args[0] === "--help" || args[0] === "-h") {
  console.log(usage);
  process.exit(0);
}

let profile = "default";
if (args[0] === "--profile") {
  args.shift();
  profile = args.shift() ?? "";
} else if (args[0]?.startsWith("--profile="))
  profile = args.shift()!.split("=", 2)[1];
if (args[0] === "--") args.shift();

if (!args.length || !["default", "lint"].includes(profile)) {
  console.error(usage);

  process.exitCode = 2;
} else {
  process.exitCode = await runValidation(
    args,
    profile === "lint" ? 4096 : 2048,
  );
}
