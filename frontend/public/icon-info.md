# Application Icons

To complete the desktop application setup, you need to add icon files:

## Required Icon Files

1. **icon.png** - 512x512 PNG for Linux
2. **icon.ico** - ICO file for Windows (multiple sizes: 16x16, 32x32, 48x48, 256x256)
3. **icon.icns** - ICNS file for macOS (multiple sizes)

## How to Create Icons

### Option 1: Use an online converter
1. Create a 512x512 PNG image with your logo
2. Use https://www.icoconverter.com/ to convert to ICO
3. Use https://cloudconvert.com/png-to-icns to convert to ICNS

### Option 2: Use electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon-source.png --output=./frontend/public
```

## Temporary Solution

For now, the app will use default Electron icons. Add your custom icons to:
- `frontend/public/icon.png`
- `frontend/public/icon.ico`
- `frontend/public/icon.icns`
