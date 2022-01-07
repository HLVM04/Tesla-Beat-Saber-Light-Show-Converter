import os
import shutil
from zipfile import ZipFile
import requests
import json

# This script handles downloading beat maps from BeatSaver

def clearFolder(folder):
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print('Failed to delete %s. Reason: %s' % (file_path, e))

def downloadBeatmap(url):
    clearFolder('BeatSaberInputLevel')
    
    print("Downloading...")
    r = requests.get(url, allow_redirects=True)
    open('downloadedBeatmap.zip', 'wb').write(r.content)

    print("Extracting...")
    with ZipFile('downloadedBeatmap.zip', 'r') as zipObj:
        # Extract all the contents of zip file in current directory
        zipObj.extractall('BeatSaberInputLevel')
    
    infoData = json.load(open('BeatSaberInputLevel/Info.dat'))
    return 'BeatSaberInputLevel/' + infoData["_difficultyBeatmapSets"][0]["_difficultyBeatmaps"][-1]["_beatmapFilename"]
