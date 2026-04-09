import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
	},
	server: {
		port: 5173
	}
});
