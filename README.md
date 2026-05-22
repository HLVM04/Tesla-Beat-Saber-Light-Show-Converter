<div align="center">

# Tesla Beat Mapper

### Convert Beat Saber maps into Tesla Light Shows, in the browser.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.design&logoColor=white)](https://threejs.org/)
[![Tesla](https://img.shields.io/badge/Tesla-CC0000?style=for-the-badge&logo=tesla&logoColor=white)](https://www.tesla.com/)
[![Beat Saber](https://img.shields.io/badge/Beat%20Saber-FF6B6B?style=for-the-badge&logo=oculus&logoColor=white)](https://beatsaber.com/)

[**Launch Tesla Beat Mapper**](https://teslabeatmapper.hlvm.dk)

</div>

---

## Overview

**Tesla Beat Mapper** is a client-side web application that automatically translates custom Beat Saber level maps into physical Tesla Light Show sequences (`.fseq` and `.xsq` formats) and synchronized audio.

Anyone can now convert, preview, optimize, and validate their custom light shows without needing terminal setups, xLights, or even a physical car nearby.

---

## Features

- **Client-Side Compiler**: Fast, secure, and private. All audio decoding, note-mapping, packaging, and compression run entirely in your web browser. No files are uploaded to any server.
- **3D Preview**: A real-time 3D preview powered by **Three.js**. Watch virtual Tesla models (Model S and Cybertruck) light up, blink, move windows, and activate signals in sync with the map’s custom lighting tracks.
- **Tesla Compatibility Validator**: Instantly monitors vehicle hardware memory limitations, verifying show duration, audio presence, and the **3,500-command limit**.
- **Light Show Trimming**: Easily crop the song and sequence. Helps you fit the light show to the limits.
- **V2 & V3 Beatmap Support**: Handles both standard legacy (V2) and modern (V3) Beat Saber map formats automatically. (Does not support modded beatmaps)
- **ZIP Bundle Export**: Generates and packages the finalized `.fseq` sequence and transcoded `.wav` audio into a ZIP in one click.

---

## How It Works

Tesla Beat Mapper parses the structure of Beat Saber beat maps and maps game actions to the car lights:

- **Left (Red) Notes & Directions**: Mapped directly to left-side lighting groups (Left Headlights, Inner/Outer Main Beams, Left Fog, Left Signature, Left Turn, and Side Repeater).
- **Right (Blue) Notes & Directions**: Mapped directly to right-side lighting groups (Right Headlights, Inner/Outer Main Beams, Right Fog, Right Signature, Right Turn, and Side Repeater).
- **Lighting Events**: Backing events are converted into physical actions (Brake Lights, License Plate lights, Rear Tail/Fog lights, Falcon Doors, Mirror Folding, and Window Rolldowns).

---

## Local Development

To run the web app on your local machine:

### Prerequisites
- [Bun](https://bun.sh/)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HLVM04/Tesla-Beat-Mapper.git
   cd TeslaBeatMapper
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Launch the development server:**
   ```bash
   bun run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to explore the converter interface.

---

## Post-Processing & Car Installation

1. Drag-and-drop a downloaded Beat Saber map into the web app.
2. Select your desired difficulty and verify/trim your sequence to stay within the command limit.
3. Download the **Bundle ZIP** and extract its contents:
   - `lightshow.fseq` (The Compiled Sequence)
   - `lightshow.wav` (The Synchronized Audio)
4. Format a USB drive as `FAT32` or `exFAT` and create a root folder named `LightShow`.
5. Place both `lightshow.fseq` and `lightshow.wav` into the `LightShow/` folder.
6. Plug the USB drive into your Tesla, open the **Toybox** $\rightarrow$ **Light Show**, and press start!

---

## Legacy Repositories

The previous command-line iterations of this project are preserved on their respective archives:
- For the original Python version, checkout the [`python-old`](https://github.com/your-username/Tesla-Beat-Saber-Light-Show-Converter/tree/python-old) branch.
- For the high-performance Go CLI tool, checkout the [`go-legacy`](https://github.com/your-username/Tesla-Beat-Saber-Light-Show-Converter/tree/go-legacy) branch.


