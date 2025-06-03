<div align="center">

# 🚗⚡ Tesla × Beat Saber | Light Show Converter

*Transform your favorite Beat Saber maps into stunning Tesla light shows*

[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![Tesla](https://img.shields.io/badge/Tesla-CC0000?style=for-the-badge&logo=tesla&logoColor=white)](https://www.tesla.com/)
[![Beat Saber](https://img.shields.io/badge/Beat%20Saber-FF6B6B?style=for-the-badge&logo=oculus&logoColor=white)](https://beatsaber.com/)

</div>

---

## 🎯 Overview

With Tesla's latest software update introducing custom light shows, this tool bridges the gap between the VR rhythm game **Beat Saber** and your Tesla's lighting system. Instead of manually creating light shows, this converter automatically translates Beat Saber level data into Tesla-compatible xLights format.

> **Note**: This project is in active development. Community contributions and feedback are welcome!

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚀 **Lightning Fast** | Built with Go for optimal performance |
| 🎵 **Audio Processing** | Automatic OGG → WAV conversion for Tesla compatibility |
| 💡 **Smart Mapping** | Notes → Front lights, Background effects → Rear lights |
| 📦 **Direct Downloads** | Download maps using direct BeatSaver links |
| 🛠️ **xLights Ready** | Generates compatible files for easy compilation in xLight |

## ⚠️ Current Limitations

> These features are planned for future releases

- **Manual Compilation Required**: Output requires xLights compilation to `.fseq` format
- **Memory Limits**: No automatic trimming for Tesla's memory constraints
- **Mod Compatibility**: Limited support for modded beat maps (Mapping Extensions, Noodle Extensions, etc.)
- **Version Support**: V4+ beat map formats not yet supported (But most custom maps use V2/V3)

## 🎥 Demonstrations

<div align="center">

### Side-by-Side Comparison
[![Tesla x Beat Saber - Light show conversion comparison](https://img.youtube.com/vi/ruYNvcawnxQ/0.jpg)](https://youtu.be/ruYNvcawnxQ)

### Live Demo
[![Tesla x Beat Saber - Light show conversion demo](https://img.youtube.com/vi/BUHGyO1Vo-Q/0.jpg)](https://www.youtube.com/watch?v=BUHGyO1Vo-Q)

</div>

## 🚀 Quick Start

### Prerequisites
- [Go 1.19+](https://golang.org/dl/) installed on your system 

> **Note**: Pre-compiled binaries may be provided in future releases

### Installation & Usage

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Tesla-Beat-Saber-Light-Show-Converter.git
   cd Tesla-Beat-Saber-Light-Show-Converter
   ```

2. **Run the converter**
   ```bash
   go run . <beatmap_url>
   ```

3. **Get BeatSaver URLs**
   - Visit [BeatSaver](https://beatsaver.com/)
   - Right-click the download button → "Copy link address"
   - URL format: `https://eu.cdn.beatsaver.com/103d39b43966277c5e4167ab086f404e0943891f.zip`

4. **Process in xLights**
   - Open the generated `.xsq` file in xLights (Inside *LightshowOutput* folder)
   - Trim if necessary to meet Tesla memory limits
   - Save as `.fseq` file
   - Use Tesla's validation script to verify compatibility

5. **Deploy to Tesla**
   - Transfer `.fseq` file to USB drive
   - Test in your Tesla! 🎉


<div align="center">

*If this project helped you create amazing light shows, consider starring it to encourage continued development!*

</div>
