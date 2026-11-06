import { Command } from "commander";

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
  .action(async (options: { suite: string }) => {
    if (options.suite !== "published") {
      console.error(`Unknown suite: ${options.suite}`);
      process.exitCode = 2;
      return;
    }

    console.error(
      "Published suite runner is not wired yet. See milestone M1 tickets.",
    );
    process.exitCode = 2;
  });

await program.parseAsync(process.argv);
