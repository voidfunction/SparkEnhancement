const path = require('path');
var webpack = require('webpack')

  module.exports = {
    entry: './graphtab/JobGraphViewModel.ts',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [ 'style-loader', 'css-loader' ]
        },
        {
          test: /\.svg$/,
          use: 'svg-loader' 
        } 
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.css', '.svg']
    },
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'graphtab')
    }
  };