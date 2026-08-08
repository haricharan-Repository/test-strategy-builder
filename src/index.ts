import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { writeExcel } from './lib/testStrategy.js';

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 --requirement <file> --output <file>')
    .option('requirement', {
      alias: 'r',
      type: 'string',
      describe: 'Path to a text file containing the requirement',
      demandOption: false,
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      describe: 'Output Excel filename',
      default: 'test_strategy.xlsx',
    })
    .help()
    .parse();

  let requirement = '';
  if (argv.requirement) {
    const requirementPath = path.resolve(argv.requirement);
    if (!fs.existsSync(requirementPath)) {
      console.error(`Requirement file not found: ${requirementPath}`);
      process.exit(1);
    }
    requirement = fs.readFileSync(requirementPath, 'utf8').trim();
  } else {
    console.log('No requirement file provided. Paste the requirement text, then press Enter.');
    requirement = fs.readFileSync(0, 'utf8').trim();
  }

  if (!requirement) {
    console.error('Requirement text cannot be empty.');
    process.exit(1);
  }

  const outputFile = path.resolve(argv.output as string);
  await writeExcel(requirement, outputFile);
  console.log(`Created Excel test strategy: ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
