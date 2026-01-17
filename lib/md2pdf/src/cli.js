#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { convert } from './index.js';

// ASCII art banner
const banner = `
${chalk.blue('┌─────────────────────────────────────┐')}
${chalk.blue('│')}  ${chalk.bold.white('md2pdf')} ${chalk.gray('- Markdown to Beautiful PDF')} ${chalk.blue('│')}
${chalk.blue('└─────────────────────────────────────┘')}
`;

program
  .name('md2pdf')
  .description('Convert markdown files to beautiful pageless PDFs')
  .version('1.0.0')
  .argument('<input>', 'Input markdown file')
  .argument('[output]', 'Output PDF file (default: same name as input)')
  .option('-t, --title <title>', 'Document title (default: extracted from H1)')
  .option('-w, --width <pixels>', 'Page width in pixels (default: 816)', '816')
  .option('--html', 'Also generate HTML preview')
  .option('-q, --quiet', 'Suppress output')
  .action(async (input, output, options) => {
    if (!options.quiet) {
      console.log(banner);
    }

    try {
      // Validate input
      if (!input.endsWith('.md') && !input.endsWith('.markdown')) {
        console.log(chalk.yellow('Warning: Input file does not have .md extension'));
      }

      if (!options.quiet) {
        console.log(chalk.gray('Converting:'), chalk.white(path.basename(input)));
      }

      const startTime = Date.now();

      const result = await convert(input, output, {
        title: options.title,
        width: parseInt(options.width, 10),
        htmlPreview: options.html
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!options.quiet) {
        console.log('');
        console.log(chalk.green('✓'), chalk.white('PDF generated successfully!'));
        console.log('');
        console.log(chalk.gray('  Output:'), chalk.cyan(result.outputPath));
        console.log(chalk.gray('  Size:'), chalk.white(`${result.dimensions.width} × ${result.dimensions.height} px`));
        console.log(chalk.gray('  Time:'), chalk.white(`${elapsed}s`));
        console.log('');
      }

    } catch (error) {
      console.error('');
      console.error(chalk.red('✗'), chalk.red('Error:'), error.message);
      console.error('');
      process.exit(1);
    }
  });

program.parse();
