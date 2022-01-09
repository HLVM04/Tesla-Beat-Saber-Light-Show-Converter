# Tesla x Beat Saber - Light Show Converter
Convert Beat Saber maps to Tesla light shows!

**This project requires FFMPEG and all packages from requirements.txt (Use "pip install -r requirements.txt")**

With the new Tesla software update a new light show feature has been added. This makes it possible to control the car lights timed with music. I however, am way too lazy to create my own light shows, so I coded a program to do it for me. As someone that has played a lot of the popular VR-game Beat Saber, I thought I could use those levels to generate a light show. This program works by taking the data from a Beat Saber level and translating it to the xLights format Tesla uses. The program is in very early stages, but I plan to build more features upon it.

### Features
- Translates note positions and timings to front lights
- Translates background effects to rear lights
- Converts ogg file to wav and links it to light show file
- Optionaly downloads direct links to beat map zip files and extracts them

### What it doesn't do (yet...)
- It doesn't output a ready-to-use fseq file. You'll have to load up the xsq file in xLights and compile it to an fseq file
- It doesn't check for any limit violations. This means you'll most likely have to trim the light show in xLights to stay within limits


Check out the side by side comparison video:

[![Tesla x Beat Saber - Light show convertion comparison](https://img.youtube.com/vi/ruYNvcawnxQ/0.jpg)](https://youtu.be/ruYNvcawnxQ)


## Usage
Run main.py with first argument being either a path to a Beat Saber difficulty file, or a direct download link to a Beat map zip file

See demo video for examples:

[![Tesla x Beat Saber - Light show convertion demo](https://img.youtube.com/vi/BUHGyO1Vo-Q/0.jpg)](https://www.youtube.com/watch?v=BUHGyO1Vo-Q)


Leave a star if you like the project to encurage me to keep working on it :)
