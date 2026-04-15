<div align="center">

# Tesla Beat Saber Light Show Converter

Convert Beat Saber maps into Tesla-compatible xLights light shows.

[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![Tesla](https://img.shields.io/badge/Tesla-CC0000?style=for-the-badge&logo=tesla&logoColor=white)](https://www.tesla.com/)
[![Beat Saber](https://img.shields.io/badge/Beat%20Saber-FF6B6B?style=for-the-badge&logo=oculus&logoColor=white)](https://beatsaber.com/)

</div>

---

## Overview

Automatically translates Beat Saber level data into Tesla-compatible xLights format. Supports V2 and V3 beat map formats, OGG to WAV audio conversion, and direct BeatSaver downloads.

**Features:**
- Built with Go for fast conversion
- Automatic OGG to WAV audio conversion
- Notes map to front lights, background events map to rear lights
- Download maps directly via BeatSaver links
- Generates `.xsq` files ready for xLights compilation

## Limitations

- Output requires xLights compilation to `.fseq` format
- No automatic trimming for Tesla's memory constraints
- Limited support for modded beat maps (Mapping Extensions, Noodle Extensions, etc.)
- V4+ beat map formats not yet supported (most custom maps use V2/V3)

## Demos

<div align="center">

[![Tesla x Beat Saber - Light show conversion comparison](https://img.youtube.com/vi/ruYNvcawnxQ/0.jpg)](https://youtu.be/ruYNvcawnxQ)

[![Tesla x Beat Saber - Light show conversion demo](https://img.youtube.com/vi/BUHGyO1Vo-Q/0.jpg)](https://www.youtube.com/watch?v=BUHGyO1Vo-Q)

</div>

## Quick Start

**Prerequisites:** [Go 1.19+](https://golang.org/dl/)

```bash
git clone https://github.com/your-username/Tesla-Beat-Saber-Light-Show-Converter.git
cd Tesla-Beat-Saber-Light-Show-Converter
go run . <beatmap_url>
```

Get BeatSaver URLs from [beatsaver.com](https://beatsaver.com/) by right-clicking the download button and copying the link address.

**Post-processing:**
1. Open the generated `.xsq` file from `LightshowOutput/` in xLights
2. Trim if necessary to meet Tesla memory limits
3. Export as `.fseq` and validate with Tesla's validation script
4. Transfer `.fseq` to a USB drive and load it in your Tesla
