const path = require('path');

module.exports = {
  entry: './src/index.jsx', // React 코드 진입점 (추후 src 폴더 생성)
  output: {
    path: path.resolve(__dirname, 'pages'), // 빌드 결과물을 저장할 디렉토리
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
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
    extensions: ['.js', '.jsx']
  },
  mode: 'development', // 혹은 'production'
  devServer: {
    static: {
      directory: path.join(__dirname, 'pages'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true
  }
};
