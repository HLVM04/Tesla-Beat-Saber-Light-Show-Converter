import zipfile
from lxml import etree
import json
import sys
import os
import math
from bindings import *
import pathlib
from pydub import AudioSegment
import validators
import shutil
from zipfile import ZipFile
import requests
import time
from multiprocessing import Process

def convert_ogg_to_wav(orig_song, dest_song):
    song = AudioSegment.from_ogg(orig_song)
    song.export(dest_song, format="wav")

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

def translateBeatmap(beatmapFilePath):
    dataDirectory = pathlib.Path(beatmapFilePath).parent
    mapData = json.load(open(beatmapFilePath))
    infoData = json.load(open(dataDirectory / "Info.dat"))

    bpmPerMillisecond = infoData["_beatsPerMinute"]/60/1000

    print("Converting egg to wav...")
    convert_ogg_to_wav(dataDirectory / infoData["_songFilename"], "lightshowOutput/lightshow.wav")

    print("Translating...")
    newSeq = etree.parse('template.xsq')
    root = newSeq.getroot()

    for node in newSeq.iter():
        if node.text is None:
            node.text = ''
    
    root.find(".//author").text = ""

    root.find(".//sequenceType").text = "Media"
    root.find(".//mediaFile").text = os.path.abspath("lightshowOutput/lightshow.wav")

    def appendToNodes(element, nodes):
        for nodeName in nodes:
            node = root.find(".//Node[@name='" + nodeName + "']")
            node.append(element)

    def getNextOff(currentIndex, type):
        for index, i in enumerate(mapData['_notes'][currentIndex:]):
            if i['_type'] == type and i['_value'] == 0:
                return i['_time'], index

    lastBlockTime = 0
    for i in mapData['_notes']:
        if i['_type'] == 0:
            startTime = math.floor(i['_time']/bpmPerMillisecond)
            if startTime > lastBlockTime: lastBlockTime = startTime
            positionString = str(i['_lineLayer']) + str(i['_lineIndex'])
            appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(startTime + 100) + '" palette="1"/>'), LightBindingsLeft[positionString])
        elif i['_type'] == 1:
            startTime = math.floor(i['_time']/bpmPerMillisecond)
            if startTime > lastBlockTime: lastBlockTime = startTime
            positionString = str(i['_lineLayer']) + str(i['_lineIndex'])
            appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(startTime + 100) + '" palette="1"/>'), LightBindingsRight[positionString])

    root.find(".//sequenceDuration").text = str(lastBlockTime/1000)
    newSeq.write("lightshowOutput/lightshow.xsq")

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
    translateBeatmap('BeatSaberInputLevel/' + infoData["_difficultyBeatmapSets"][0]["_difficultyBeatmaps"][-1]["_beatmapFilename"])

if __name__ == "__main__":
    startTime = time.time()
    if validators.url(sys.argv[1]) is True:
        downloadBeatmap(sys.argv[1])
    else:
        translateBeatmap(sys.argv[1])
    print("Done in " + str( math.floor((time.time() - startTime)*1000)/1000 ) + "s!")
