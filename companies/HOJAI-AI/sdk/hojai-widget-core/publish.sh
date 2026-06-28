#!/bin/bash
# HOJAI Widget CDN Publish Script
# Builds and publishes the widget to npm + CDN

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 Building HOJAI Widget..."

# Install dependencies
npm install

# Build the widget
echo "🔨 Building..."
npm run build

# Create CDN-ready bundle
echo "📁 Creating CDN bundle..."
mkdir -p dist/cdn

# Minified bundle for CDN
cat dist/index.mjs | terser --compress --mangle > dist/cdn/hojai-widget.min.js

# UMD build for legacy support
cat dist/index.cjs | terser --compress --mangle > dist/cdn/hojai-widget.umd.min.js

# Create snippet.js
cp dist/snippet.js dist/cdn/hojai-widget.js

# Version
VERSION=$(node -p "require('./package.json').version")

# Create embeddable snippet
cat > dist/cdn/embed.html << EOF
<!-- HOJAI Widget Embed -->
<script>
  window.hojaiConfig = {
    apiKey: 'YOUR_API_KEY',
    companyId: 'YOUR_COMPANY_ID',
    color: '#3B82F6',
    position: 'bottom-right'
  };
</script>
<script src="https://cdn.hojai.ai/widget/\${VERSION}/hojai-widget.min.js"></script>
EOF

# Create version info
cat > dist/cdn/version.json << EOF
{
  "version": "$VERSION",
  "cdn": "https://cdn.hojai.ai/widget/$VERSION/",
  "published": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Build complete!"
echo ""
echo "📦 Package ready at: dist/"
echo "🌐 CDN ready at: dist/cdn/"
echo "📝 Embed:"
echo "   <script src=\"https://cdn.hojai.ai/widget/$VERSION/hojai-widget.min.js\"></script>"
echo ""
echo "🚀 To publish to npm:"
echo "   npm publish --access public"
echo ""
echo "📤 To upload to CDN:"
echo "   scp -r dist/cdn/* cdn-server:/var/www/html/widget/$VERSION/"
