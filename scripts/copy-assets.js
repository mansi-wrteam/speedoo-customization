const fs = require("fs-extra");

// Static export (NEXT_PUBLIC_SEO != "true"): Apache needs the rewrite rules
// next to the exported files. This used to be done by `exportPathMap` in
// next.config.mjs.
async function copyHtaccess() {
  if (!fs.existsSync("out") || !fs.existsSync(".htaccess")) return;
  try {
    await fs.copy(".htaccess", "out/.htaccess");
    console.log(".htaccess copied to out/");
  } catch (err) {
    console.error("Error copying .htaccess:", err);
  }
}

async function copy() {
  if (!fs.existsSync(".next/standalone")) {
    console.log("No standalone output, skipping asset copy.");
    return;
  }
  try {
    await fs.copy("public", ".next/standalone/public");
    await fs.copy(".next/static", ".next/standalone/.next/static");
    console.log("Assets copied successfully");
  } catch (err) {
    console.error("Error copying assets:", err);
  }
}

copyHtaccess().then(copy);
