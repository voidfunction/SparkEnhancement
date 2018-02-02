const path = require('path');
const webpack = require('webpack');

const CommonsChunkPlugin = require('./node_modules/webpack/lib/optimize/CommonsChunkPlugin');
const LoaderOptionsPlugin = require('./node_modules/webpack/lib/LoaderOptionsPlugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        datatab: ['./src/datatab/index.ts'],
        logtab: ['./src/logtab/index.ts'],
        graphtab: ['./src/graphtab/index.ts']
    },
    output: {
        path: path.join(__dirname, 'build'),
        filename: '[name].bundle.js'
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js', '.css', '.svg']
    },
    // local web service for debugging
    devServer: {
        contentBase: './',//web server root path
        historyApiFallback: true,
        inline: true,// refresh realtime for debuging
        port: 8080
    },
    plugins: [
        new LoaderOptionsPlugin({
            debug: true
        }),

        // for data tab
        new HtmlWebpackPlugin({
            filename: path.join(__dirname, 'build/datatab/index.html'),
            template: path.join(__dirname, 'src/datatab/index.html'),
            inject: 'body',
            hash: true,
            chunks: ['datatab']
        }),
        // for log tab
        new HtmlWebpackPlugin({
            filename: path.join(__dirname, 'build/logtab/index.html'),
            template: path.join(__dirname, 'src/logtab/index.html'),
            inject: 'body',
            hash: true,
            chunks: ['logtab']
        }),
        // for graph tab
        new HtmlWebpackPlugin({
            filename: path.join(__dirname, 'build/graphtab/index.html'),
            template: path.join(__dirname, 'src/graphtab/index.html'),
            inject: 'body',
            hash: true,
            chunks: ['graphtab']
        }),
        new ExtractTextPlugin({
            filename: '[name].css'
        })
    ],
    module: {
        loaders: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            { test: /\.tsx?$/, loader: 'ts-loader' },
            // {test:/\.css$/,loader: ExtractTextPlugin.extract('style', 'css')},
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            },
            // for resource files
            { test: /[(\.png)|(\.eot)|(\.woff2?)]$/, loader: 'file-loader' },
            { test: /\.svg$/,use: 'svg-loader'} 
        ]
    }
}
