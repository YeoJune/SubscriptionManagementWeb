const path = require('path');

module.exports = {
  entry: './src/app.tsx', // React 코드 진입점 (추후 src 폴더 생성)
  output: {
    path: path.resolve(__dirname, 'dist'), // 빌드 결과물을 저장할 디렉토리
    filename: 'bundle.js',
    publicPath: '/', // ✅ React Router를 위한 설정
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  mode: 'development', // 혹은 'production'
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3001,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    ],
    hot: true,
    open: true,
    historyApiFallback: true,
  }
};
