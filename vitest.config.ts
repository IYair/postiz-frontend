import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    server: {
      deps: {
        inline: [],
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    conditions: [],
    mainFields: ['main', 'module'],
    alias: [
      { find: '@gitroom/frontend/components/new-launch/add.edit.modal', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/add-edit-modal.mock.tsx') },
      { find: /^@gitroom\/frontend\/components\/new-launch\/add\.edit\.modal$/, replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/add-edit-modal.mock.tsx') },
      { find: '@gitroom/frontend/components/launches/calendar.context', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/calendar-context.mock.tsx') },
      { find: '@gitroom/frontend/components/layout/new-modal', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/new-modal.mock.tsx') },
      { find: '@gitroom/helpers/utils/custom.fetch', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/custom-fetch.mock.tsx') },
      { find: '@gitroom/react/toaster/toaster', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/toaster.mock.tsx') },
      { find: '@gitroom/react/form/button', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/button.mock.tsx') },
      { find: '@gitroom/frontend/components/launches/helpers/use.existing.data', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/use-existing-data.mock.tsx') },
      { find: '@gitroom/helpers/utils/posts.list.minify', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/posts-list-minify.mock.ts') },
      { find: 'swr', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/swr.mock.ts') },
      { find: 'react-use-cookie', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/react-use-cookie.mock.ts') },
      { find: 'zustand', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/zustand.mock.ts') },
      { find: 'zustand/react/shallow', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/zustand-shallow.mock.ts') },
      { find: 'react-hotkeys-hook', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/react-hotkeys-hook.mock.ts') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/next-navigation.mock.ts') },
      { find: '@prisma/client', replacement: path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/prisma-client.mock.ts') },
      { find: '@gitroom/backend', replacement: path.resolve(__dirname, './apps/backend/src') },
      { find: '@gitroom/frontend', replacement: path.resolve(__dirname, './apps/frontend/src') },
      { find: '@gitroom/helpers', replacement: path.resolve(__dirname, './libraries/helpers/src') },
      { find: '@gitroom/nestjs-libraries', replacement: path.resolve(__dirname, './libraries/nestjs-libraries/src') },
      { find: '@gitroom/react', replacement: path.resolve(__dirname, './libraries/react-shared-libraries/src') },
      { find: '@gitroom/plugins', replacement: path.resolve(__dirname, './libraries/plugins/src') },
      { find: '@gitroom/orchestrator', replacement: path.resolve(__dirname, './apps/orchestrator/src') },
      { find: '@gitroom/extension', replacement: path.resolve(__dirname, './apps/extension/src') },
    ],
  },
    plugins: [
    {
      name: 'mui-interceptor',
      enforce: 'pre',
      resolveId(id) {
        if (id === '@mui/utils/composeClasses' || id === '@mui/utils/composeClasses/index.js') {
          return path.resolve(__dirname, './apps/frontend/src/components/tools/__tests__/mocks/mui-compose-classes.mock.ts');
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@mui/*'],
  },
});
