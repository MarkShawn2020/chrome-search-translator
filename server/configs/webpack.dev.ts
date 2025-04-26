import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { HotModuleReplacementPlugin } from 'webpack';
import merge from 'webpack-merge';

import { resolveSrc } from '../utils/path';
import commonConfig from './webpack.common';

const devConfig = merge(commonConfig, {
    mode: 'development',
    devtool: 'eval-source-map',
    optimization: {
        minimize: false, // 开发模式下禁用压缩，保持代码原样
    },
    plugins: [
        new HotModuleReplacementPlugin(),
        new ReactRefreshWebpackPlugin({
            overlay: {
                sockIntegration: 'whm',
            },
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                memoryLimit: 1024,
                configFile: resolveSrc('tsconfig.json'),
            },
        }),
    ],
});

export default devConfig;
