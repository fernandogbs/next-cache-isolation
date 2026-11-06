import { Command } from "commander";

import { runPublishedSuite } from "../suites/published.js";

const program = new Command();

program
  .name("next-cache-isolation")
  .description(
    "Dynamic cache isolation testing for Next.js Cache Components apps",
  )
  .version("0.1.0");

program
  .command("test")
  .description("Run cache isolation scenarios")
  .option("--suite <name>", "Suite to run", "published")
  .option("--base-port <port>", "Base localhost port for fixtures", "43110")
  .action(async (options: { suite: string; basePort: string }) => {
    if (options.suite !== "published") {
      console.error(`Unknown suite: ${options.suite}`);
      process.exitCode = 2;
      return;
    }

    const basePort = Number.parseInt(options.basePort, 10);
    if (!Number.isFinite(basePort) || basePort <= 0) {
      console.error(`Invalid --base-port: ${options.basePort}`);
      process.exitCode = 2;
      return;
    }

    const { exitCode } = await runPublishedSuite({ basePort });
    process.exitCode = exitCode;
  });

await program.parseAsync(process.argv);
