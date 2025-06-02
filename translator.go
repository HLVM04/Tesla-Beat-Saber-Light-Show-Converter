package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const LightBlinkDuration = 100

type MapData struct {
	Notes  []Note  `json:"_notes"`
	Events []Event `json:"_events"`
}

type Note struct {
	Time      float64 `json:"_time"`
	LineLayer int     `json:"_lineLayer"`
	LineIndex int     `json:"_lineIndex"`
	Type      int     `json:"_type"`
}

type Event struct {
	Time  float64 `json:"_time"`
	Type  int     `json:"_type"`
	Value int     `json:"_value"`
}

type InfoDataTranslator struct {
	BeatsPerMinute        float64 `json:"_beatsPerMinute"`
	DifficultyBeatmapSets []struct {
		DifficultyBeatmaps []struct {
			CustomData struct {
				Requirements []string `json:"_requirements"`
			} `json:"_customData"`
		} `json:"_difficultyBeatmaps"`
	} `json:"_difficultyBeatmapSets"`
}

func translateBeatmap(beatmapFilePath string) error {
	dataDirectory := filepath.Dir(beatmapFilePath)

	mapFile, err := os.Open(beatmapFilePath)
	if err != nil {
		return err
	}
	defer mapFile.Close()

	var mapData MapData
	if err := json.NewDecoder(mapFile).Decode(&mapData); err != nil {
		return err
	}

	infoFile, err := os.Open(filepath.Join(dataDirectory, "Info.dat"))
	if err != nil {
		return err
	}
	defer infoFile.Close()

	var infoData InfoDataTranslator
	if err := json.NewDecoder(infoFile).Decode(&infoData); err != nil {
		return err
	}

	bpmPerMillisecond := infoData.BeatsPerMinute / 60 / 1000

	// Check for required mods
	if len(infoData.DifficultyBeatmapSets) > 0 && len(infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps) > 0 {
		requirements := infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps[len(infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps)-1].CustomData.Requirements
		for _, requirement := range requirements {
			fmt.Printf("WARNING: This beat map requires a mod that isn't supported and might cause issues with the conversion: %s\n", requirement)
		}
	}

	fmt.Println("Translating...")

	// Read template
	templateFile, err := os.Open("template.xsq")
	if err != nil {
		return err
	}
	defer templateFile.Close()

	templateContent, err := io.ReadAll(templateFile)
	if err != nil {
		return err
	}

	// Parse XML template
	var doc interface{}
	if err := xml.Unmarshal(templateContent, &doc); err != nil {
		return err
	}

	// For simplicity, we'll create the XML structure as strings
	// In a production environment, you'd want to use proper XML parsing
	xmlContent := string(templateContent)

	// Replace template values
	xmlContent = strings.Replace(xmlContent, "<author></author>", "<author></author>", -1)
	xmlContent = strings.Replace(xmlContent, "<sequenceType>", "<sequenceType>Media</sequenceType><sequenceType>", -1)

	absPath, _ := filepath.Abs("LightshowOutput/lightshow.wav")
	xmlContent = strings.Replace(xmlContent, "<mediaFile>", "<mediaFile>"+absPath+"</mediaFile><mediaFile>", -1)

	var effects []string
	lastBlockTime := 0.0

	// Process notes
	for _, note := range mapData.Notes {
		startTime := int(math.Floor(note.Time / bpmPerMillisecond))
		if float64(startTime) > lastBlockTime {
			lastBlockTime = float64(startTime)
		}

		positionString := strconv.Itoa(note.LineLayer) + strconv.Itoa(note.LineIndex)

		var bindings []string
		var exists bool

		if note.Type == 0 { // Left (red) note
			bindings, exists = LightBindingsLeft[positionString]
		} else if note.Type == 1 { // Right (blue) note
			bindings, exists = LightBindingsRight[positionString]
		}

		if !exists {
			continue
		}

		for _, binding := range bindings {
			effect := fmt.Sprintf(`<Effect ref="0" name="On" selected="1" startTime="%d" endTime="%d" palette="1" node="%s"/>`,
				startTime, startTime+LightBlinkDuration, binding)
			effects = append(effects, effect)
		}
	}

	// Helper function to find next off event
	getNextOff := func(currentIndex, eventType int) *float64 {
		for i := currentIndex + 1; i < len(mapData.Events); i++ {
			if mapData.Events[i].Type == eventType {
				return &mapData.Events[i].Time
			}
		}
		return nil
	}

	// Process events
	for index, event := range mapData.Events {
		startTime := int(math.Floor(event.Time / bpmPerMillisecond))
		nextOff := getNextOff(index, event.Type)
		var endTime int
		if nextOff != nil {
			endTime = int(math.Floor(*nextOff / bpmPerMillisecond))
		} else {
			endTime = int(lastBlockTime)
		}

		var rearBinding []string
		isBlue := event.Value > 0 && event.Value < 4
		isRed := event.Value > 4 && event.Value < 8

		if event.Type == 1 {
			if isBlue {
				rearBinding = LightBindingsRear[0]
			} else if isRed {
				rearBinding = LightBindingsRear[1]
			}
		} else if event.Type == 0 {
			if isBlue {
				rearBinding = LightBindingsRear[2]
			} else if isRed {
				rearBinding = LightBindingsRear[3]
			}
		}

		if rearBinding == nil {
			continue
		}

		for _, binding := range rearBinding {
			effect := fmt.Sprintf(`<Effect ref="0" name="On" selected="1" startTime="%d" endTime="%d" palette="1" node="%s"/>`,
				startTime, endTime, binding)
			effects = append(effects, effect)
		}
	}

	// Add effects to XML (simplified approach)
	for _, effect := range effects {
		xmlContent += effect + "\n"
	}

	// Set sequence duration
	duration := fmt.Sprintf("%.1f", lastBlockTime/1000+5)
	xmlContent = strings.Replace(xmlContent, "<sequenceDuration>", "<sequenceDuration>"+duration+"</sequenceDuration><sequenceDuration>", -1)

	// Write output
	outFile, err := os.Create("LightshowOutput/lightshow.xsq")
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = outFile.WriteString(xmlContent)
	return err
}
