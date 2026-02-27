// setup.js — Copies Transformers.js into the extension bundle
const fs = require('fs');
const path = require('path');

const LIB_DIR = path.join(__dirname, 'lib');

if (!fs.existsSync(LIB_DIR)) {
  fs.mkdirSync(LIB_DIR, { recursive: true });
}

// Copy the main transformers bundle
const srcFile = path.join(__dirname, 'node_modules', '@huggingface', 'transformers', 'dist', 'transformers.min.js');
const destFile = path.join(LIB_DIR, 'transformers.min.js');

if (!fs.existsSync(srcFile)) {
  console.error('❌ Transformers.js not found. Run "npm install" first.');
  process.exit(1);
}

fs.copyFileSync(srcFile, destFile);
console.log('✅ Copied transformers.min.js to lib/');

// Also copy the WASM files if they exist
const wasmDir = path.join(__dirname, 'node_modules', '@huggingface', 'transformers', 'dist');
const wasmFiles = fs.readdirSync(wasmDir).filter(f => f.endsWith('.wasm'));
wasmFiles.forEach(f => {
  fs.copyFileSync(path.join(wasmDir, f), path.join(LIB_DIR, f));
  console.log(`✅ Copied ${f} to lib/`);
});

console.log('\n🎉 Setup complete! You can now load the extension in Chrome.');
console.log('   Go to chrome://extensions → Enable Developer Mode → Load Unpacked → Select this folder');
