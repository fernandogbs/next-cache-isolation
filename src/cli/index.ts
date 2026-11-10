import { Command } from "commander";

import { initCustomSuiteConfig } from "../config/init.js";
import { printDoctorReport, runDoctor } from "../config/doctor.js";
import { runCustomSuite } from "../suites/custom.js";
import { runPublishedSuite } from "../suites/published.js";

const program = new Command();

program
  .name("next-cache-isolation")
  .description(
    "Dynamic cache isolation testing for Next.js Cache Components apps",
  )
  .version("0.2.0");

program
  .command("init")
  .description("Scaffold next-cache-isolation.yml for a custom suite")
  .option("--force", "Overwrite an existing config file", false)
  .action(async (options: { force: boolean }) => {
    try {
      const result = await initCustomSuiteConfig({ force: options.force });
      console.log(`Wrote ${result.configPath}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    }
  });

program
  .command("doctor")
  .description("Validate Node, config, and fixture manifests")
  .option("--config <path>", "Path to next-cache-isolation.yml")
  .action(async (options: { config?: string }) => {
    const report = await runDoctor(
      options.config ? { configPath: options.config } : {},
    );
    printDoctorReport(report);
    process.exitCode = report.exitCode;
  });

program
  .command("test")
  .description("Run cache isolation scenarios")
  .option("--suite <name>", "Suite to run (published|custom)", "published")
  .option("--config <path>", "Custom suite config (suite=custom)")
  .option("--base-port <port>", "Base localhost port for fixtures", "43110")
  .action(
    async (options: { suite: string; config?: string; basePort: string }) => {
      const basePort = Number.parseInt(options.basePort, 10);
      if (!Number.isFinite(basePort) || basePort <= 0) {
        console.error(`Invalid --base-port: ${options.basePort}`);
        process.exitCode = 2;
        return;
      }

      try {
        switch (options.suite) {
          case "published": {
            const { exitCode } = await runPublishedSuite({ basePort });
            process.exitCode = exitCode;
            return;
          }
          case "custom": {
            const { exitCode } = await runCustomSuite({
              ...(options.config ? { configPath: options.config } : {}),
              basePort,
            });
            process.exitCode = exitCode;
            return;
          }
          default: {
            console.error(`Unknown suite: ${options.suite}`);
            process.exitCode = 2;
          }
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 2;
      }
    },
  );

await program.parseAsync(process.argv);
