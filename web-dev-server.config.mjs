import { esbuildPlugin } from '@web/dev-server-esbuild';

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  nodeResolve: false,
  open: '/demo/',

  plugins: [
    esbuildPlugin({
      loaders: {
        '.css': 'binary',
      },
    }),
  ],
});
