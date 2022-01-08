from lxml import etree
import json
import pathlib
from pydub import AudioSegment
import math
import os

from Bindings import *

# This script translates a beat map into a Tesla lightshow. This is where the magic happens! Or, well... it's just code
# It converts the beat map ogg/egg file to wav, translates the map file into an xsq light show file, and exports it into the LightshowOuput folder
# This works by assigning each hand to either right or left Tesla light. Then based on the in-game note position it will be assigned a specific LED
# Bindings.py contains the note to LED light bindings
# Beat Saber map format: https://bsmg.wiki/mapping/map-format.html#difficulty-file

LightBlinkDuration = 100 # How long each blink should last in milliseconds

def convert_ogg_to_wav(orig_song, dest_song):
    song = AudioSegment.from_ogg(orig_song)
    song.export(dest_song, format="wav")

def translateBeatmap(beatmapFilePath):
    dataDirectory = pathlib.Path(beatmapFilePath).parent
    mapData = json.load(open(beatmapFilePath))
    infoData = json.load(open(dataDirectory / "Info.dat"))

    # Calculate the bpm
    bpmPerMillisecond = infoData["_beatsPerMinute"]/60/1000

    # Convert media
    print("Converting egg to wav...")
    convert_ogg_to_wav(dataDirectory / infoData["_songFilename"], "LightshowOutput/lightshow.wav")

    print("Translating...")
    newSeq = etree.parse('template.xsq') # This is a template of an empty Tesla light show
    root = newSeq.getroot()

    for node in newSeq.iter():
        if node.text is None:
            node.text = ''
    
    root.find(".//author").text = ""

    root.find(".//sequenceType").text = "Media"
    root.find(".//mediaFile").text = os.path.abspath("LightshowOutput/lightshow.wav")

    def appendToNodes(element, nodes):
        for nodeName in nodes:
            new_element = etree.fromstring(etree.tostring(element))
            node = root.find(".//Node[@name='" + nodeName + "']")
            node.append(new_element)

    def getNextOff(currentIndex, type, value):
        for index, i in enumerate(mapData['_events'][currentIndex+1:]):
            if i['_type'] == type:
                return i['_time']

    # Notes goes on the front lights
    lastBlockTime = 0
    for i in mapData['_notes']: 
        if i['_type'] == 0: # Type 0 is left (red) note
            startTime = math.floor(i['_time']/bpmPerMillisecond)
            if startTime > lastBlockTime: lastBlockTime = startTime
            positionString = str(i['_lineLayer']) + str(i['_lineIndex'])
            appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(startTime + LightBlinkDuration) + '" palette="1"/>'), LightBindingsLeft[positionString])
        elif i['_type'] == 1: # Type 0 is right (blue) notes
            startTime = math.floor(i['_time']/bpmPerMillisecond)
            if startTime > lastBlockTime: lastBlockTime = startTime
            positionString = str(i['_lineLayer']) + str(i['_lineIndex'])
            appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(startTime + LightBlinkDuration) + '" palette="1"/>'), LightBindingsRight[positionString])
    
    # Light events goes on the back and blinkers
    for index, i in enumerate(mapData['_events']):
        if i['_type'] == 1:
            if i['_value'] > 0 and i['_value'] < 4:
                startTime = math.floor(i['_time']/bpmPerMillisecond)
                nextOff = getNextOff(index, i['_type'], i['_value']) or startTime + 100
                endTime = math.floor(nextOff /bpmPerMillisecond)
                appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(endTime) + '" palette="1"/>'), LightBindingsRear[0])
            elif i['_value'] > 4 and i['_value'] < 8:
                startTime = math.floor(i['_time']/bpmPerMillisecond)
                nextOff = getNextOff(index, i['_type'], i['_value']) or startTime + 100
                endTime = math.floor(nextOff /bpmPerMillisecond)
                appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(endTime) + '" palette="1"/>'), LightBindingsRear[1])
        elif i['_type'] == 0:
            if i['_value'] > 0 and i['_value'] < 4:
                startTime = math.floor(i['_time']/bpmPerMillisecond)
                nextOff = getNextOff(index, i['_type'], i['_value']) or startTime + 100
                endTime = math.floor(nextOff /bpmPerMillisecond)
                appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(endTime) + '" palette="1"/>'), LightBindingsRear[2])
            elif i['_value'] > 4 and i['_value'] < 8:
                startTime = math.floor(i['_time']/bpmPerMillisecond)
                nextOff = getNextOff(index, i['_type'], i['_value']) or startTime + 100
                endTime = math.floor(nextOff /bpmPerMillisecond)
                appendToNodes(etree.fromstring('<Effect ref="0" name="On" selected="1" startTime="' + str(startTime) + '" endTime="' + str(endTime) + '" palette="1"/>'), LightBindingsRear[3])

            

    # Set sequence duration to last note plus some seconds
    root.find(".//sequenceDuration").text = str(lastBlockTime/1000 + 5)
    newSeq.write("LightshowOutput/lightshow.xsq")
