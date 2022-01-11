import sys
import os
import math
import validators
import time

from ContentDelivery import *
from Translator import *

# Make sure folder exists
os.makedirs("BeatSaberInputLevel", exist_ok=True)
os.makedirs("LightshowOutput", exist_ok=True)

if __name__ == "__main__":
    startTime = time.time()
    if validators.url(sys.argv[1]) is True:
        difficultyMapPath = downloadBeatmap(sys.argv[1])
        translateBeatmap(difficultyMapPath)
    else:
        translateBeatmap(sys.argv[1])
    print("Done in " + str( math.floor((time.time() - startTime)*1000)/1000 ) + "s!")
