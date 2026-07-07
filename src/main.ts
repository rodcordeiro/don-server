import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) {
	loadEnvFile('.env');
}

const { Bootstrap } = await import('./bootstrap/bootstrap');

try {
	Bootstrap.start();
} catch (error) {
	console.error('[bootstrap.error]', error);
	process.exit(1);
}
