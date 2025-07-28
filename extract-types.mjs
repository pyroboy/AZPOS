import fs from 'fs/promises';
import path from 'path';

const storesDir = 'src/lib/stores';
const outputFile = 'src/lib/types/index.ts';

async function main() {
	try {
		const files = await fs.readdir(storesDir);
		let allTypeDefs = `import { z } from 'zod';\n\n`;

		for (const file of files) {
			if (path.extname(file) === '.ts') {
				const filePath = path.join(storesDir, file);
				const content = await fs.readFile(filePath, 'utf-8');

				const schemaRegex = /export const (\w+Schema) = z\.object\({[^}]*}\);?/gs;
				const typeRegex = /export type (\w+) = z\.infer<typeof \w+Schema>;/g;

				let match;
				while ((match = schemaRegex.exec(content)) !== null) {
					allTypeDefs += `${match[0]}\n\n`;
				}
				while ((match = typeRegex.exec(content)) !== null) {
					allTypeDefs += `${match[0]}\n\n`;
				}
			}
		}

		await fs.writeFile(outputFile, allTypeDefs);
		console.log(`Successfully consolidated types to ${outputFile}`);
	} catch (error) {
		console.error('Error consolidating types:', error);
	}
}

main();
