export default {
  appId: 'com.vellummd.app',
  productName: 'VellumMD',
  directories: { output: 'dist-build' },
  files: ['dist-electron/**', 'dist/**'],
  mac: {
    category: 'public.app-category.productivity',
    icon: 'assets/icon.icns',
    target: ['dmg', 'zip']
  },
  win: {
    icon: 'assets/icon.ico',
    target: [{ target: 'nsis', arch: ['x64'] }]
  },
  linux: {
    icon: 'assets/icon.png',
    target: ['AppImage', 'deb'],
    category: 'Office'
  },
  publish: { provider: 'github', releaseType: 'release' }
};
