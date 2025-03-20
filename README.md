# SubscriptionManagementWeb

SubscriptionManagementWeb 프로젝트는 Node/Express 백엔드와 React 프론트엔드를 webpack과 Babel을 통해 통합한 풀스택 애플리케이션입니다.

## 프로젝트 개요

- **백엔드:** Express 서버(`server.js`)가 API 라우트와 정적 파일(React 빌드 결과물)을 서빙합니다.
- **프론트엔드:** React 애플리케이션은 `/src` 폴더 내에 있으며, webpack과 Babel을 통해 번들링됩니다.
- **스타일링:** CSS 파일은 `style-loader`와 `css-loader`를 이용해 처리되며, 기본적으로 "Hello, React!" 메시지를 포함한 간단한 UI를 제공합니다.

## 프로젝트 구조

```
/SubscriptionManagementWeb
├── /src
│   ├── index.jsx         # React 애플리케이션의 진입점
│   ├── app.jsx           # 기본 App 컴포넌트 (Hello, React! 메시지 포함)
│   └── global.css        # 전역 CSS 스타일 (awesome한 디자인 적용)
├── /pages
│   └── index.html        # HTML 파일 (React 번들(bundle.js)을 로드)
├── /routes               # Express 서버 설정 파일
│   └── server.js         # 백엔드 관련 라우팅 파일
│   └── ...
├── server.js             # Express 서버 설정 파일
├── webpack.config.js     # Webpack 설정 파일
└── package.json          # 프로젝트 및 스크립트 설정
```

## 설치 및 초기 설정

1. **저장소 클론:**

```bash
git clone <repository-url>
cd SubscriptionManagementWeb
```

2. npm 패키지 설치:

```bash
npm install
```

3. webpack, Babel, CSS 관련 devDependency 설치 (이미 설치되어 있지 않다면):

```bash
npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader style-loader css-loader @babel/core @babel/preset-env @babel/preset-react
```

## 개발 환경 실행

개발 시에는 webpack-dev-server를 사용하여 핫 리로딩 및 빠른 빌드를 이용할 수 있습니다.

1. webpack.config.js 파일 내 devServer 설정을 확인합니다.

예시:

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
    hot: true,
    open: true,
  },
};
```

2. **개발 서버 실행**:

```bash
npm run dev
```

• 명령어 실행 후 기본 브라우저가 자동으로 열리며, http://localhost:3000에서 애플리케이션을 확인할 수 있습니다.

3. **프로덕션 빌드**:

프로덕션 번들을 생성하려면 다음 명령어를 실행합니다.

```bash
npm run build
```

• 위 명령어는 React 앱을 번들링하여 /public 폴더 내에 bundle.js 파일 등 빌드 결과물을 생성합니다.
• server.js는 이 결과물을 정적 파일로 서빙하도록 설정되어 있습니다.

4. **Express 서버 실행**:

프로덕션 모드 또는 Express 서버를 통해 애플리케이션을 실행하려면:

```bash
npm start
```

• 이 명령어는 server.js를 실행하여 http://localhost:3000에서 애플리케이션을 제공합니다.
