const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{onnxruntime-node,sharp,@img}/**/*"
    },
    extraResource: [
      "./src/scripts"
    ],
    ignore: (file) => {
      if (!file) return false;
      if (['/src', '/package.json'].includes(file)) return false;
      if (file.startsWith('/.vite')) return false;
      if (file.startsWith('/node_modules')) return false;
      if (file.startsWith('/build')) return false;
      // Ignora para não empacotar no asar, já que vai como extraResource
      if (file.startsWith('/src/scripts')) return true;
      if (file.endsWith('.pt') || file.endsWith('.onnx')) return false;
      
      if (file.startsWith('/src/') && !file.startsWith('/src/scripts')) return true;
      if (/^\/(\.github|\.git|dist|out|runs)/.test(file)) return true;
      if (/^\/[^\/]+\.(js|ts|mjs|json|md|yaml)$/.test(file) && file !== '/package.json') return true;
      
      return false;
    },
    osxSign: process.env.APPLE_ID ? {
      hardenedRuntime: true,
      entitlements: 'build/entitlements.mac.plist',
      entitlementsInherit: 'build/entitlements.mac.plist',
      gatekeeperAssess: false
    } : undefined,
    osxNotarize: (process.env.APPLE_ID && process.env.APPLE_ID_PASSWORD) ? {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    } : undefined,
    windowsSign: {
      timestampServer: "http://timestamp.acs.microsoft.com",
      hash: "sha256",
      signWithParams: "/a"
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },

    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
