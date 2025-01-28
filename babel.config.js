export default {
    presets: [
      '@babel/preset-env',
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: [
      ['babel-plugin-react-compiler', {
        memoization: {
          enabled: true,
          include: ['**/components/**'],
          exclude: []
        }
      }]
    ]
  };