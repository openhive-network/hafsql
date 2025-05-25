/**
 *  OpenAPI definitions are generated and served by Scalar
 */

import { ApiParserOptions, openApi, Router } from '../../deps.ts'

// @ts-ignore for some reason the default export is not detected correctly
const spec = openApi({
	include: ['src/api/ui/*', 'src/api/routes/*.ts', '**.yaml'],
	verbose: false,
} as ApiParserOptions)

spec.servers = [{ url: Deno.env.get('API_PREFIX') || '' }]

export const scalar = new Router()
	/**
	 * GET /openapi.json
	 * @summary OpenAPI definitions
	 * @description The OpenAPI definitions of the HafSQL APIs as JSON.
	 * @tag OpenAPI
	 * @response 200 - JSON
	 * @responseContent {object} 200.application/json
	 */
	.get('/openapi.json', (context) => {
		context.response.body = spec
	})
	.get('/', (context) => {
		context.response.body = `
    <!doctype html>
    <html>
      <head>
        <title>HafSQL API Reference</title>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1" />
        <style>
          :root {
            --scalar-custom-header-height: 50px;
          }
          .custom-header {
            height: var(--scalar-custom-header-height);
            background-color: var(--scalar-background-1);
            box-shadow: inset 0 -1px 0 var(--scalar-border-color);
            color: var(--scalar-color-1);
            font-size: var(--scalar-font-size-2);
            padding: 0 18px;
            position: sticky;
            justify-content: space-between;
            top: 0;
            z-index: 100;
          }
          .custom-header,
          .custom-header nav {
            display: flex;
            align-items: center;
            gap: 18px;
          }
          .custom-header a:hover {
            color: var(--scalar-color-2);
          }
          a {
            text-decoration: none;
          }
          .request-item {
            // overflow-y: hidden !important;
          }
        </style>
      </head>
      <body>
        <header class="custom-header scalar-app">
          <a href="/#"><b>HafSQL APIs</b></a>
          <nav>
            <a target="_blank" href="https://gitlab.com/mahdiyari/hafsql">GitLab</a>
          </nav>
        </header>
        <!-- Need a Custom Header? Check out this example https://codepen.io/scalarorg/pen/VwOXqam -->
        <script
          id="api-reference"
          type="application/json">
          ${JSON.stringify(spec)}
        </script>

        <script>
          var configuration = {
            theme: 'bluePlanet',
            favicon: '/favicon.ico',
            hideModels: true,
            hideClientButton: true,
            servers: [
              {
                url: document.URL.split('#')[0],
                description: 'HafSQL',
              },
            ]
          }

          document.getElementById('api-reference').dataset.configuration =
            JSON.stringify(configuration)
        </script>

        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
    `
	})
	.get('/favicon.ico', async (ctx) => {
		await ctx.send({
			root: Deno.cwd(),
			index: `favicon.ico`,
		})
	})
