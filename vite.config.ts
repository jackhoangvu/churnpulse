import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

const defaultHost = 'localhost';
const defaultPort = 5173;

function resolvePublicUrl(value: string | undefined): URL | null {
	if (!value) {
		return null;
	}

	try {
		return new URL(value);
	} catch {
		return null;
	}
}

function resolveHmr(publicUrl: URL | null) {
	if (!publicUrl || ['localhost', '127.0.0.1'].includes(publicUrl.hostname)) {
		return {
			host: defaultHost,
			port: defaultPort,
			clientPort: defaultPort,
			protocol: 'ws' as const
		};
	}

	const isHttps = publicUrl.protocol === 'https:';

	return {
		host: publicUrl.hostname,
		clientPort: publicUrl.port ? Number(publicUrl.port) : isHttps ? 443 : 80,
		protocol: isHttps ? ('wss' as const) : ('ws' as const)
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const publicUrl = resolvePublicUrl(env.PUBLIC_APP_URL);
	const allowedHosts = Array.from(
		new Set(
			[defaultHost, '127.0.0.1', publicUrl?.hostname].filter(
				(value): value is string => Boolean(value)
			)
		)
	);

	return {
		plugins: [sveltekit()],
		define: {
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
		},
		server: {
			host: '0.0.0.0',
			port: defaultPort,
			strictPort: true,
			allowedHosts,
			hmr: resolveHmr(publicUrl)
		}
	};
});
