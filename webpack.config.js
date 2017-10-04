/**
 * Webpack configuration file
 * */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const isProd = process.env.NODE_ENV === 'production';

function HashBundlePlugin() {}
HashBundlePlugin.prototype.apply = (compiler) => {
  compiler.plugin('done', (statsData) => {
    const stats = statsData.toJson();
    const htmlFileName = 'index.html';
    const html = fs.readFileSync(path.join(__dirname, htmlFileName), 'utf8');
    const htmlOutput = html.replace(/\/build\/.?bundle\.js/, `/build/bundle.js?h=${stats.hash}`);
    fs.writeFileSync(path.join(__dirname, htmlFileName), htmlOutput);
  });
};

const config = {
  entry: ['babel-polyfill', path.resolve(__dirname, 'src')],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    publicPath: 'build/',
  },
  resolve: {
    extensions: ['.jsx', '.js', '.css', '.json'],
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'assets'),
      path.resolve(__dirname, 'node_modules'),
    ],
  },
  context: __dirname,
  module: {
    rules: [{
      test: /\.css$/,
      loader: 'style-loader!css-loader',
    }, {
      test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'url-loader?limit=10000&minetype=application/font-woff&name=[hash].[ext]',
    }, {
      test: /\.(ttf|eot|svg|jpg|gif|png)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'file-loader?name=[hash].[ext]',
    }, {
      test: /\.(js|jsx)$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader',
    }],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      API_HOST: JSON.stringify(process.env.API_HOST || 'https://api.opendota.com'),
    }),
  ],
  devServer: {
    contentBase: __dirname,
    host: '0.0.0.0',
    disableHostCheck: true,
    port: Number(process.env.PORT) || 8080,
    historyApiFallback: true,
    compress: true,
  },
};

if (!isProd) {
  config.devtool = 'eval-source-map';
  config.entry = [
    `webpack-dev-server/client?http://${config.devServer.host}:${config.devServer.port}`,
    'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
    'babel-polyfill',
    path.resolve(__dirname, 'src'),
  ];
  config.plugins.push(new webpack.NamedModulesPlugin());
} else {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin());
  config.plugins.push(new HashBundlePlugin());
}

module.exports = config;
