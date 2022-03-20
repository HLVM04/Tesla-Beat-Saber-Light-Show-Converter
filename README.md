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
- It doesn't support beat maps that requires mods (Such as Mapping Extensions, Noodle Extensions, etc.)


Check out the side by side comparison video:

[![Tesla x Beat Saber - Light show convertion comparison](https://img.youtube.com/vi/ruYNvcawnxQ/0.jpg)](https://youtu.be/ruYNvcawnxQ)


## Usage
Run main.py with first argument being either a path to a Beat Saber difficulty file, or a direct download link to a Beat map zip file

See demo video for examples:

[![Tesla x Beat Saber - Light show convertion demo](https://img.youtube.com/vi/BUHGyO1Vo-Q/0.jpg)](https://www.youtube.com/watch?v=BUHGyO1Vo-Q)


Leave a star if you like the project to encurage me to keep working on it :)

## Step-by-step instructions
1. Download the repository as a zip from GitHub
2. Make sure you have Python3 installed on your computer. You can get it from www.python.org
3. Unzip the zip file you previously downloaded. This is the project folder
4. Make sure you have FFMpeg installed on your system. If you're using a Mac, I recommend installing it using homebrew. If you're on windows, download the essential binaries from here: https://www.gyan.dev/ffmpeg/builds/ (Download the file called "ffmpeg-release-essentials.zip")
4b. (For windows only) Extract the zip ffmpeg zip file, go to bin folder and copy all of the content into the same folder as main.py
5. Open the project folder in the terminal (For windows users i recommend typing "cmd" in the adress bar, when inside the project folder)
6. Type "python3 main.py URL", but replace the URL part with a link to a BeatSaver map.
6b. To get the direct link to a beatsaver map, right click the download button on the beatsaver page and copy the link. It should look like this: https://eu.cdn.beatsaver.com/103d39b43966277c5e4167ab086f404e0943891f.zip
7. The program should now generate a lightshow, and put it in the output folder
8. You can now open the lightshow file in xLights, eventually trim it to fit the limitations, and then save it as a .fseq file (Use the validation script form Tesla's official lightshow repo)
9. Done! Put it on your flashdrive and test it :)
