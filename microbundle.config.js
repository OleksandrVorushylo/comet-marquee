import importCss from "rollup-plugin-import-css";

export default {
  plugins: [
    importCss({
      minify: true,
      inject: true,
      output: "dist/comet-marquee.css"
    })
  ]
};