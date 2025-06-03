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

	"github.com/gopxl/beep/vorbis"
	"github.com/gopxl/beep/wav"
)

const (
	LightBlinkDuration    = 100
	SequenceBufferTime    = 5.0 // seconds
	MillisecondsPerMinute = 60000.0
)

type MapData struct {
	Version string  `json:"_version"`
	Notes   []Note  `json:"_notes"`
	Events  []Event `json:"_events"`
}

type Note struct {
	Time      float64 `json:"_time"`
	LineIndex int     `json:"_lineIndex"`
	LineLayer int     `json:"_lineLayer"`
	Type      int     `json:"_type"`
}

type Event struct {
	Time  float64 `json:"_time"`
	Type  int     `json:"_type"`
	Value int     `json:"_value"`
}

type MapDataV3 struct {
	Version string    `json:"version"`
	Notes   []NoteV3  `json:"colorNotes"`
	Events  []EventV3 `json:"basicBeatmapEvents"`
}

type NoteV3 struct {
	Time      float64 `json:"b"`
	LineIndex int     `json:"x"`
	LineLayer int     `json:"y"`
	Type      int     `json:"c"`
}

type EventV3 struct {
	Time  float64 `json:"b"`
	Type  int     `json:"et"`
	Value int     `json:"i"`
}

type InfoDataTranslator struct {
	Version               string  `json:"_version"`
	BeatsPerMinute        float64 `json:"_beatsPerMinute"`
	SongFileName          string  `json:"_songFilename"`
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

	fmt.Printf("BeatMap Version: %s\n", infoData.Version)
	checkRequiredMods(infoData)

	// Convert song.egg to wav if it exists (for local files)
	if err := convertSongToWav(dataDirectory, infoData.SongFileName); err != nil {
		fmt.Printf("Warning: Failed to convert audio file: %v\n", err)
	}

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

func detectMapVersion(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	var rawMap map[string]interface{}
	if err := json.NewDecoder(file).Decode(&rawMap); err != nil {
		return "", err
	}

	// Check for v3 version field
	if version, exists := rawMap["version"]; exists {
		if versionStr, ok := version.(string); ok {
			return versionStr, nil
		}
	}

	// Check for v2 version field
	if version, exists := rawMap["_version"]; exists {
		if versionStr, ok := version.(string); ok {
			return versionStr, nil
		}
	}

	return "", fmt.Errorf("no version field found")
}

func loadMapData(filePath string) (*MapData, error) {
	version, err := detectMapVersion(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to detect map version: %w", err)
	}

	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Determine major version
	majorVersion := strings.Split(version, ".")[0]

	switch majorVersion {
	case "3":
		fmt.Printf("Detected Beat Saber map version %s\n", version)
		var mapDataV3 MapDataV3
		if err := json.NewDecoder(file).Decode(&mapDataV3); err != nil {
			return nil, err
		}
		return convertV3ToV2(&mapDataV3), nil
	case "2":
		fmt.Printf("Detected Beat Saber map version %s\n", version)
		var mapData MapData
		if err := json.NewDecoder(file).Decode(&mapData); err != nil {
			return nil, err
		}
		return &mapData, nil
	default:
		fmt.Printf("WARNING: Unsupported Beat Saber map version %s detected. This version is not officially supported and may cause issues.\n", version)
		fmt.Println("Attempting to parse using newest supported format (V3)...")

		// Reset file position and attempt V3 parsing
		if _, err := file.Seek(0, 0); err != nil {
			return nil, fmt.Errorf("failed to reset file position: %w", err)
		}

		var mapDataV3 MapDataV3
		if err := json.NewDecoder(file).Decode(&mapDataV3); err != nil {
			return nil, fmt.Errorf("failed to parse as V3 format: %w", err)
		}
		return convertV3ToV2(&mapDataV3), nil
	}
}

func convertV3ToV2(mapV3 *MapDataV3) *MapData {
	mapV2 := &MapData{
		Version: mapV3.Version,
		Notes:   make([]Note, len(mapV3.Notes)),
		Events:  make([]Event, len(mapV3.Events)),
	}

	// Convert notes
	for i, noteV3 := range mapV3.Notes {
		mapV2.Notes[i] = Note{
			Time:      noteV3.Time,
			LineIndex: noteV3.LineIndex,
			LineLayer: noteV3.LineLayer,
			Type:      noteV3.Type,
		}
	}

	// Convert events
	for i, eventV3 := range mapV3.Events {
		mapV2.Events[i] = Event{
			Time:  eventV3.Time,
			Type:  eventV3.Type,
			Value: eventV3.Value,
		}
	}

	return mapV2
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
	Effects           map[string][]string // Changed to map by element name
	LastBlockTime     float64
}

func (c *LightshowConverter) GenerateLightshow() error {
	c.Effects = make(map[string][]string)
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
			effect := fmt.Sprintf(`        <Effect ref="0" name="On" startTime="%d" endTime="%d" palette="0"/>`,
				startTime, startTime+LightBlinkDuration)
			c.Effects[binding] = append(c.Effects[binding], effect)
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
			effect := fmt.Sprintf(`        <Effect ref="0" name="On" startTime="%d" endTime="%d" palette="0"/>`,
				startTime, endTime)
			c.Effects[binding] = append(c.Effects[binding], effect)
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
	duration := fmt.Sprintf("%.3f", c.LastBlockTime/1000+SequenceBufferTime)

	replacements := map[string]string{
		"MEDIA_FILE_PATH":   absPath,
		"SEQUENCE_DURATION": duration,
	}

	for old, new := range replacements {
		xmlContent = strings.Replace(xmlContent, old, new, 1)
	}

	// Add effects to their respective elements
	for lightName, effects := range c.Effects {
		if len(effects) > 0 {
			// Find the element in the XML and replace its empty EffectLayer
			elementPattern := fmt.Sprintf(`<Element type="model" name="%s">
      <EffectLayer/>
    </Element>`, lightName)

			effectsContent := strings.Join(effects, "\n")
			replacement := fmt.Sprintf(`<Element type="model" name="%s">
      <EffectLayer>
%s
      </EffectLayer>
    </Element>`, lightName, effectsContent)

			xmlContent = strings.Replace(xmlContent, elementPattern, replacement, 1)
		}
	}

	return xmlContent, nil
}

func convertSongToWav(beatSaberDir string, songFileName string) error {
	if songFileName == "" {
		songFileName = "song.egg"
	}
	eggPath := filepath.Join(beatSaberDir, songFileName)

	// Check if song.egg exists
	if _, err := os.Stat(eggPath); os.IsNotExist(err) {
		return fmt.Errorf("song.egg file not found")
	}

	fmt.Println("Converting audio file...")

	// Open the input OGG file (song.egg)
	oggFile, err := os.Open(eggPath)
	if err != nil {
		return fmt.Errorf("failed to open song.egg file: %w", err)
	}
	defer oggFile.Close()

	// Decode the OGG file using gopxl/beep/vorbis
	streamer, format, err := vorbis.Decode(oggFile)
	if err != nil {
		return fmt.Errorf("failed to decode OGG file: %w", err)
	}
	defer streamer.Close()

	// Ensure output directory exists
	outputDir := "LightshowOutput"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Create the output WAV file
	wavPath := filepath.Join(outputDir, "lightshow.wav")
	wavFile, err := os.Create(wavPath)
	if err != nil {
		return fmt.Errorf("failed to create WAV file: %w", err)
	}
	defer wavFile.Close()

	// Encode the audio stream to WAV format using gopxl/beep/wav
	if err := wav.Encode(wavFile, streamer, format); err != nil {
		return fmt.Errorf("failed to encode WAV file: %w", err)
	}

	fmt.Printf("Successfully converted audio to %s\n", wavPath)
	return nil
}

func clearFolder(folder string) error {
	if err := os.MkdirAll(folder, 0755); err != nil {
		return err
	}

	dir, err := os.Open(folder)
	if err != nil {
		return err
	}
	defer dir.Close()

	names, err := dir.Readdirnames(-1)
	if err != nil {
		return err
	}

	for _, name := range names {
		if err := os.RemoveAll(filepath.Join(folder, name)); err != nil {
			fmt.Printf("Warning: Failed to delete %s: %v\n", filepath.Join(folder, name), err)
		}
	}
	return nil
}
