package main

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	LightBlinkDuration    = 100
	SequenceBufferTime    = 5.0 // seconds
	MillisecondsPerMinute = 60000.0
)

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
	if err := validateInputFile(beatmapFilePath); err != nil {
		return fmt.Errorf("invalid input file: %w", err)
	}

	dataDirectory := filepath.Dir(beatmapFilePath)

	mapData, err := loadMapData(beatmapFilePath)
	if err != nil {
		return fmt.Errorf("failed to load map data: %w", err)
	}

	infoData, err := loadInfoData(filepath.Join(dataDirectory, "Info.dat"))
	if err != nil {
		return fmt.Errorf("failed to load info data: %w", err)
	}

	checkRequiredMods(infoData)

	fmt.Println("Translating...")

	converter := &LightshowConverter{
		BPMPerMillisecond: infoData.BeatsPerMinute / MillisecondsPerMinute,
		MapData:           mapData,
	}

	if err := converter.GenerateLightshow(); err != nil {
		return fmt.Errorf("failed to generate lightshow: %w", err)
	}

	return nil
}

func validateInputFile(filePath string) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("file does not exist: %s", filePath)
	}
	return nil
}

func loadMapData(filePath string) (*MapData, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var mapData MapData
	if err := json.NewDecoder(file).Decode(&mapData); err != nil {
		return nil, err
	}
	return &mapData, nil
}

func loadInfoData(filePath string) (*InfoDataTranslator, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var infoData InfoDataTranslator
	if err := json.NewDecoder(file).Decode(&infoData); err != nil {
		return nil, err
	}
	return &infoData, nil
}

func checkRequiredMods(infoData *InfoDataTranslator) {
	if len(infoData.DifficultyBeatmapSets) > 0 && len(infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps) > 0 {
		requirements := infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps[len(infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps)-1].CustomData.Requirements
		for _, requirement := range requirements {
			fmt.Printf("WARNING: This beat map requires a mod that isn't supported and might cause issues with the conversion: %s\n", requirement)
		}
	}
}

type LightshowConverter struct {
	BPMPerMillisecond float64
	MapData           *MapData
	Effects           []string
	LastBlockTime     float64
}

func (c *LightshowConverter) GenerateLightshow() error {
	c.processNotes()
	c.processEvents()
	return c.writeOutput()
}

func (c *LightshowConverter) processNotes() {
	for _, note := range c.MapData.Notes {
		startTime := int(math.Floor(note.Time / c.BPMPerMillisecond))
		if float64(startTime) > c.LastBlockTime {
			c.LastBlockTime = float64(startTime)
		}

		positionKey := strconv.Itoa(note.LineLayer) + strconv.Itoa(note.LineIndex)
		bindings := c.getBindingsForNote(note.Type, positionKey)

		for _, binding := range bindings {
			effect := fmt.Sprintf(`<Effect ref="0" name="On" selected="1" startTime="%d" endTime="%d" palette="1" node="%s"/>`,
				startTime, startTime+LightBlinkDuration, binding)
			c.Effects = append(c.Effects, effect)
		}
	}
}

func (c *LightshowConverter) getBindingsForNote(noteType int, positionKey string) []string {
	switch noteType {
	case 0: // Left (red) note
		if bindings, exists := LightBindingsLeft[positionKey]; exists {
			return bindings
		}
	case 1: // Right (blue) note
		if bindings, exists := LightBindingsRight[positionKey]; exists {
			return bindings
		}
	}
	return nil
}

func (c *LightshowConverter) processEvents() {
	for index, event := range c.MapData.Events {
		startTime := int(math.Floor(event.Time / c.BPMPerMillisecond))
		endTime := c.calculateEventEndTime(index, event.Type)

		bindings := c.getBindingsForEvent(event)
		for _, binding := range bindings {
			effect := fmt.Sprintf(`<Effect ref="0" name="On" selected="1" startTime="%d" endTime="%d" palette="1" node="%s"/>`,
				startTime, endTime, binding)
			c.Effects = append(c.Effects, effect)
		}
	}
}

func (c *LightshowConverter) calculateEventEndTime(currentIndex, eventType int) int {
	for i := currentIndex + 1; i < len(c.MapData.Events); i++ {
		if c.MapData.Events[i].Type == eventType {
			return int(math.Floor(c.MapData.Events[i].Time / c.BPMPerMillisecond))
		}
	}
	return int(c.LastBlockTime)
}

func (c *LightshowConverter) getBindingsForEvent(event Event) []string {
	isBlue := event.Value > 0 && event.Value < 4
	isRed := event.Value > 4 && event.Value < 8

	var bindingIndex int
	switch {
	case event.Type == 1 && isBlue:
		bindingIndex = 0
	case event.Type == 1 && isRed:
		bindingIndex = 1
	case event.Type == 0 && isBlue:
		bindingIndex = 2
	case event.Type == 0 && isRed:
		bindingIndex = 3
	default:
		return nil
	}

	if bindings, exists := LightBindingsRear[bindingIndex]; exists {
		return bindings
	}
	return nil
}

func (c *LightshowConverter) writeOutput() error {
	xmlContent, err := c.buildXMLContent()
	if err != nil {
		return err
	}

	if err := os.MkdirAll("LightshowOutput", 0755); err != nil {
		return err
	}

	outFile, err := os.Create("LightshowOutput/lightshow.xsq")
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = outFile.WriteString(xmlContent)
	return err
}

func (c *LightshowConverter) buildXMLContent() (string, error) {
	templateFile, err := os.Open("template.xsq")
	if err != nil {
		return "", fmt.Errorf("failed to open template: %w", err)
	}
	defer templateFile.Close()

	templateContent, err := io.ReadAll(templateFile)
	if err != nil {
		return "", fmt.Errorf("failed to read template: %w", err)
	}

	xmlContent := string(templateContent)

	// Apply template replacements
	absPath, _ := filepath.Abs("LightshowOutput/lightshow.wav")
	duration := fmt.Sprintf("%.1f", c.LastBlockTime/1000+SequenceBufferTime)

	replacements := map[string]string{
		"<sequenceType>":     "<sequenceType>Media</sequenceType><sequenceType>",
		"<mediaFile>":        "<mediaFile>" + absPath + "</mediaFile><mediaFile>",
		"<sequenceDuration>": "<sequenceDuration>" + duration + "</sequenceDuration><sequenceDuration>",
	}

	for old, new := range replacements {
		xmlContent = strings.Replace(xmlContent, old, new, 1)
	}

	// Add effects
	for _, effect := range c.Effects {
		xmlContent += effect + "\n"
	}

	return xmlContent, nil
}
