module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@api': './src/api',
          '@store': './src/store',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@types': './src/types',
          '@i18n': './src/i18n',
          '@theme': './src/theme',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};