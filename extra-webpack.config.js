const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;

module.exports = (config, options) => {
  const singleSpaWebpackConfig = singleSpaAngularWebpack(config, options);

  // Excluir archivos problemáticos del source-map-loader
  singleSpaWebpackConfig.module.rules.forEach(rule => {
    if (rule.use && rule.use.some(use => use.loader && use.loader.includes('source-map-loader'))) {
      rule.exclude = [
        /node_modules\/webpack/,
        /node_modules\/@ng-select/
      ];
    }
  });

  return singleSpaWebpackConfig;
};
