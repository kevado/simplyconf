const path = require('path');
const fs = require('fs');
const TerserPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

// Resolve an add-on's src/ directory.
// When WPORG_BUILD=true (set by build-wporg.sh), always use the in-tree stub so
// the compiled dist/ contains only core code — matching the source WP.org reviewers see.
// In normal monorepo builds, use the real add-on source when present.
function addonSrc(addonName) {
	if (process.env.WPORG_BUILD === 'true') {
		return path.resolve(__dirname, `src/stubs/${addonName}`);
	}
	const real = path.resolve(__dirname, `../${addonName}/src`);
	return fs.existsSync(real)
		? real
		: path.resolve(__dirname, `src/stubs/${addonName}`);
}

module.exports = {
	mode: isProduction ? 'production' : 'development',
	devtool: isProduction ? false : 'source-map',
	performance: {
		hints: isProduction ? 'warning' : false,
	},
	entry: './src/index.js',
	output: {
		filename: 'simplyconf.js',
		path: path.resolve(__dirname, 'dist'),
		chunkFilename: '[name].chunk.js',
		publicPath: '/wp-content/plugins/simplyconf/dist/',
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
				options: {
					presets: ['@babel/preset-env', '@babel/preset-react'],
					plugins: ['@babel/plugin-transform-class-properties'],
				},
			},
			{
				test: /\.jsx$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-react'],
					},
				},
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.scss$/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
			{
				test: /\.(png|jpe?g|gif|svg)$/i,
				type: 'asset/resource',
				generator: {
					filename: 'images/[name][ext][query]',
				},
			},
			{
				test: /\.(woff(2)?|eot|ttf|otf|svg)$/,
				type: 'asset/resource',
				generator: {
					filename: 'fonts/[name][ext][query]',
				},
			},
		],
	},
	resolve: {
		alias: {
			'@state': path.resolve(__dirname, './src/state'),
			'@services': path.resolve(__dirname, './src/services'),
			'@components': path.resolve(__dirname, './src/components'),
			'@config': path.resolve(__dirname, './src/config'),
			'@utils': path.resolve(__dirname, './src/utils'),
			'@hooks': path.resolve(__dirname, './src/hooks'),
			'@shared': path.resolve(__dirname, './src/components/shared'),
			'@assets': path.resolve(__dirname, './assets'),
			'@libs': path.resolve(__dirname, './src/libs'),
			'simplyconf-reviews': addonSrc('simplyconf-reviews'),
			'simplyconf-schedules': addonSrc('simplyconf-schedules'),
			jquery: path.resolve(__dirname, './src/libs/jquery-stub.js'),
			// Alias @wordpress/i18n to our own utility
			'@wordpress/i18n': path.resolve(__dirname, './src/utils/i18n.js'),
		},
		modules: ['node_modules'],
		extensions: ['.js', '.jsx', '.scss', '.css', '.json'],
	},
	externals: {
		jquery: 'jQuery', // Use WordPress-provided jQuery
		react: 'React', // Use WordPress-provided React
		'react-dom': 'ReactDOM', // Use WordPress-provided ReactDOM
		'@wordpress/element': 'wp.element', // Use WordPress-provided element (React wrapper)
		// '@wordpress/i18n': 'wp.i18n', // REMOVED - using our own i18n utility instead
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					compress: {
						pure_funcs: isProduction
							? ['console.log', 'console.debug', 'console.info']
							: [],
					},
				},
			}),
		],
	},
	devServer: {
		static: {
			directory: path.join(__dirname, 'dist'), // Serve content from 'dist'
		},
		compress: true,
		port: 3200, // Localhost port
		historyApiFallback: true, // Handle routing fallback
		hot: true, // Enable hot reloading
		open: true, // Automatically open the app in the browser
	},
};
