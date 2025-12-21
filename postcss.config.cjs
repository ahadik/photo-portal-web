module.exports = () => {
    return {
      plugins: [
        require('autoprefixer')(),
        require('postcss-nested'),
        require("postcss-combine-media-query"),
        require("postcss-combine-duplicated-selectors"),
        require("postcss-prettify"),
      ],
    };
  };
