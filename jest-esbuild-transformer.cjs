const { transformSync } = require("esbuild");

module.exports = {
  process(sourceText, sourcePath) {
    const { code, map } = transformSync(sourceText, {
      format: "cjs",
      loader: sourcePath.endsWith(".mjs") ? "js" : "js",
      platform: "node",
      sourcemap: "inline",
      sourcefile: sourcePath,
    });

    return {
      code,
      map,
    };
  },
};
