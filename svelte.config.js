import adapter from '@sveltejs/adapter-vercel';
import { mdsvex } from 'mdsvex';
import { defineMDSveXConfig as defineConfig } from 'mdsvex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

// Remark plugin: convert relative markdown image links to Svelte-friendly imports
// This allows using `![alt](./image.png)` in markdown and have Vite bundle the asset.
function remarkRelativeImagesToImports() {
    return (tree) => {
        function transform(node) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node.children)) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    // MD AST image node
                    if (child && child.type === 'image' && typeof child.url === 'string') {
                        const url = child.url.trim();
                        const isExternal = /^(https?:)?\/\//.test(url);
                        const isRootAbsolute = url.startsWith('/');
                        if (!isExternal && !isRootAbsolute) {
                            const alt = (child.alt || '').replace(/"/g, '&quot;');
                            const title = child.title ? ` title=\"${String(child.title).replace(/"/g, '&quot;')}\"` : '';
                            // Replace node with raw HTML that Svelte/mdsvex will compile
                            node.children[i] = {
                                type: 'html',
                                value: `<img src={new URL('${url}', import.meta.url).href} alt="${alt}"${title} />`
                            };
                            continue;
                        }
                    }
                    transform(child);
                }
            }
        }
        transform(tree);
    };
}

const mdsvexConfig = defineConfig({
	extensions: ['.md'],
	smartypants: {
		dashes: 'oldschool'
	},
	remarkPlugins: [remarkGfm, remarkRelativeImagesToImports],
	rehypePlugins: [
		rehypeSlug
	],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const { codeToHtml } = await import('shiki');
			const html = await codeToHtml(code, {
				lang,
				theme: 'github-dark'
			});
			return `{@html \`${html}\` }`;
		}
	}
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', ...mdsvexConfig.extensions],
	preprocess: [mdsvex(mdsvexConfig)],
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// ignore deliberate link to shiny 404 page
				if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
					return;
				}
				
				// otherwise fail the build
				throw new Error(message);
			}
		}
	}
};

export default config;
