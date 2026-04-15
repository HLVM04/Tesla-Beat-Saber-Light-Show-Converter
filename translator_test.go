package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// --- Map version detection ---

func TestDetectMapVersion_V2(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "map.dat")
	writeJSON(t, fp, map[string]interface{}{"_version": "2.0.0", "_notes": []interface{}{}, "_events": []interface{}{}})

	version, err := detectMapVersion(fp)
	if err != nil {
		t.Fatal(err)
	}
	if version != "2.0.0" {
		t.Fatalf("expected 2.0.0, got %s", version)
	}
}

func TestDetectMapVersion_V3(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "map.dat")
	writeJSON(t, fp, map[string]interface{}{"version": "3.2.0", "colorNotes": []interface{}{}, "basicBeatmapEvents": []interface{}{}})

	version, err := detectMapVersion(fp)
	if err != nil {
		t.Fatal(err)
	}
	if version != "3.2.0" {
		t.Fatalf("expected 3.2.0, got %s", version)
	}
}

func TestDetectMapVersion_Missing(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "map.dat")
	writeJSON(t, fp, map[string]interface{}{"notes": []interface{}{}})

	_, err := detectMapVersion(fp)
	if err == nil {
		t.Fatal("expected error for missing version")
	}
}

// --- V3 to V2 conversion ---

func TestConvertV3ToV2(t *testing.T) {
	v3 := &MapDataV3{
		Version: "3.2.0",
		Notes: []NoteV3{
			{Time: 1.0, LineIndex: 2, LineLayer: 1, Type: 0},
			{Time: 2.5, LineIndex: 3, LineLayer: 0, Type: 1},
		},
		Events: []EventV3{
			{Time: 1.0, Type: 1, Value: 2},
		},
	}

	v2 := convertV3ToV2(v3)

	if len(v2.Notes) != 2 {
		t.Fatalf("expected 2 notes, got %d", len(v2.Notes))
	}
	if v2.Notes[0].Time != 1.0 || v2.Notes[0].LineIndex != 2 || v2.Notes[0].Type != 0 {
		t.Fatalf("note 0 mismatch: %+v", v2.Notes[0])
	}
	if v2.Notes[1].Time != 2.5 || v2.Notes[1].LineIndex != 3 || v2.Notes[1].Type != 1 {
		t.Fatalf("note 1 mismatch: %+v", v2.Notes[1])
	}
	if len(v2.Events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(v2.Events))
	}
	if v2.Events[0].Type != 1 || v2.Events[0].Value != 2 {
		t.Fatalf("event mismatch: %+v", v2.Events[0])
	}
}

// --- loadMapData ---

func TestLoadMapData_V2(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "map.dat")
	writeJSON(t, fp, map[string]interface{}{
		"_version": "2.0.0",
		"_notes": []map[string]interface{}{
			{"_time": 4.0, "_lineIndex": 1, "_lineLayer": 2, "_type": 0},
		},
		"_events": []map[string]interface{}{
			{"_time": 4.0, "_type": 1, "_value": 3},
		},
	})

	data, err := loadMapData(fp)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Notes) != 1 || data.Notes[0].Time != 4.0 {
		t.Fatalf("unexpected notes: %+v", data.Notes)
	}
	if len(data.Events) != 1 || data.Events[0].Value != 3 {
		t.Fatalf("unexpected events: %+v", data.Events)
	}
}

func TestLoadMapData_V3(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "map.dat")
	writeJSON(t, fp, map[string]interface{}{
		"version": "3.0.0",
		"colorNotes": []map[string]interface{}{
			{"b": 2.0, "x": 1, "y": 0, "c": 1},
		},
		"basicBeatmapEvents": []map[string]interface{}{
			{"b": 2.0, "et": 0, "i": 5},
		},
	})

	data, err := loadMapData(fp)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Notes) != 1 || data.Notes[0].Time != 2.0 {
		t.Fatalf("unexpected notes: %+v", data.Notes)
	}
}

// --- loadInfoData ---

func TestLoadInfoData(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "Info.dat")
	writeJSON(t, fp, map[string]interface{}{
		"_version":        "2.0.0",
		"_beatsPerMinute": 120.0,
		"_songFilename":   "song.egg",
		"_difficultyBeatmapSets": []map[string]interface{}{
			{
				"_difficultyBeatmaps": []map[string]interface{}{
					{"_customData": map[string]interface{}{"_requirements": []string{"Noodle Extensions"}}},
				},
			},
		},
	})

	info, err := loadInfoData(fp)
	if err != nil {
		t.Fatal(err)
	}
	if info.BeatsPerMinute != 120.0 {
		t.Fatalf("expected BPM 120, got %f", info.BeatsPerMinute)
	}
	if info.SongFileName != "song.egg" {
		t.Fatalf("expected song.egg, got %s", info.SongFileName)
	}
}

// --- Note binding logic ---

func TestGetBindingsForNote_Left(t *testing.T) {
	c := &LightshowConverter{}
	bindings := c.getBindingsForNote(0, "12") // Left note, layer=1, index=2
	if len(bindings) == 0 {
		t.Fatal("expected bindings for left note at 12")
	}
	expected := LightBindingsLeft["12"]
	if len(bindings) != len(expected) {
		t.Fatalf("expected %d bindings, got %d", len(expected), len(bindings))
	}
}

func TestGetBindingsForNote_Right(t *testing.T) {
	c := &LightshowConverter{}
	bindings := c.getBindingsForNote(1, "00") // Right note, layer=0, index=0
	expected := LightBindingsRight["00"]
	if len(bindings) != len(expected) {
		t.Fatalf("expected %d bindings, got %d", len(expected), len(bindings))
	}
}

func TestGetBindingsForNote_InvalidType(t *testing.T) {
	c := &LightshowConverter{}
	bindings := c.getBindingsForNote(5, "00") // Bomb or invalid
	if bindings != nil {
		t.Fatalf("expected nil bindings for type 5, got %v", bindings)
	}
}

func TestGetBindingsForNote_InvalidPosition(t *testing.T) {
	c := &LightshowConverter{}
	bindings := c.getBindingsForNote(0, "99")
	if bindings != nil {
		t.Fatalf("expected nil bindings for invalid position, got %v", bindings)
	}
}

// --- Event binding logic ---

func TestGetBindingsForEvent_BlueType1(t *testing.T) {
	c := &LightshowConverter{}
	event := Event{Type: 1, Value: 2} // Blue, type 1 -> index 0
	bindings := c.getBindingsForEvent(event)
	expected := LightBindingsRear[0]
	if len(bindings) != len(expected) {
		t.Fatalf("expected %d bindings, got %d", len(expected), len(bindings))
	}
}

func TestGetBindingsForEvent_RedType1(t *testing.T) {
	c := &LightshowConverter{}
	event := Event{Type: 1, Value: 5} // Red, type 1 -> index 1
	bindings := c.getBindingsForEvent(event)
	expected := LightBindingsRear[1]
	if len(bindings) != len(expected) {
		t.Fatalf("expected %d bindings, got %d", len(expected), len(bindings))
	}
}

func TestGetBindingsForEvent_BlueType0(t *testing.T) {
	c := &LightshowConverter{}
	event := Event{Type: 0, Value: 1} // Blue, type 0 -> index 2
	bindings := c.getBindingsForEvent(event)
	expected := LightBindingsRear[2]
	if len(bindings) != len(expected) {
		t.Fatalf("expected %d bindings, got %d", len(expected), len(bindings))
	}
}

func TestGetBindingsForEvent_Off(t *testing.T) {
	c := &LightshowConverter{}
	event := Event{Type: 0, Value: 0} // Off event
	bindings := c.getBindingsForEvent(event)
	if bindings != nil {
		t.Fatalf("expected nil for off event, got %v", bindings)
	}
}

// --- calculateEventEndTime ---

func TestCalculateEventEndTime_NextSameType(t *testing.T) {
	bpm := 120.0
	c := &LightshowConverter{
		BPMPerMillisecond: bpm / MillisecondsPerMinute,
		MapData: &MapData{
			Events: []Event{
				{Time: 1.0, Type: 1, Value: 2},
				{Time: 2.0, Type: 0, Value: 5},
				{Time: 3.0, Type: 1, Value: 3},
			},
		},
		LastBlockTime: 10000,
	}

	endTime := c.calculateEventEndTime(0, 1)
	expected := int(math.Floor(3.0 / c.BPMPerMillisecond))
	if endTime != expected {
		t.Fatalf("expected %d, got %d", expected, endTime)
	}
}

func TestCalculateEventEndTime_NoNextSameType(t *testing.T) {
	c := &LightshowConverter{
		BPMPerMillisecond: 120.0 / MillisecondsPerMinute,
		MapData: &MapData{
			Events: []Event{
				{Time: 1.0, Type: 1, Value: 2},
				{Time: 2.0, Type: 0, Value: 5},
			},
		},
		LastBlockTime: 5000,
	}

	endTime := c.calculateEventEndTime(0, 1)
	if endTime != 5000 {
		t.Fatalf("expected LastBlockTime 5000, got %d", endTime)
	}
}

// --- processNotes ---

func TestProcessNotes(t *testing.T) {
	bpm := 120.0
	c := &LightshowConverter{
		BPMPerMillisecond: bpm / MillisecondsPerMinute,
		MapData: &MapData{
			Notes: []Note{
				{Time: 1.0, LineIndex: 0, LineLayer: 0, Type: 0},
				{Time: 2.0, LineIndex: 1, LineLayer: 1, Type: 1},
			},
		},
		Effects: make(map[string][]string),
	}

	c.processNotes()

	if len(c.Effects) == 0 {
		t.Fatal("expected effects to be populated")
	}

	// Check that effects contain proper startTime/endTime
	for name, effects := range c.Effects {
		for _, effect := range effects {
			if !strings.Contains(effect, "startTime=") || !strings.Contains(effect, "endTime=") {
				t.Fatalf("effect for %s missing time attributes: %s", name, effect)
			}
		}
	}
}

func TestProcessNotes_TracksLastBlockTime(t *testing.T) {
	bpm := 120.0
	bpmPerMs := bpm / MillisecondsPerMinute
	c := &LightshowConverter{
		BPMPerMillisecond: bpmPerMs,
		MapData: &MapData{
			Notes: []Note{
				{Time: 1.0, LineIndex: 0, LineLayer: 0, Type: 0},
				{Time: 5.0, LineIndex: 0, LineLayer: 0, Type: 0},
			},
		},
		Effects: make(map[string][]string),
	}

	c.processNotes()

	expectedLastBlock := float64(int(math.Floor(5.0 / bpmPerMs)))
	if c.LastBlockTime != expectedLastBlock {
		t.Fatalf("expected LastBlockTime %f, got %f", expectedLastBlock, c.LastBlockTime)
	}
}

// --- processEvents ---

func TestProcessEvents(t *testing.T) {
	bpm := 120.0
	c := &LightshowConverter{
		BPMPerMillisecond: bpm / MillisecondsPerMinute,
		MapData: &MapData{
			Events: []Event{
				{Time: 1.0, Type: 1, Value: 2},
				{Time: 3.0, Type: 1, Value: 3},
			},
		},
		Effects:       make(map[string][]string),
		LastBlockTime: 10000,
	}

	c.processEvents()

	if len(c.Effects) == 0 {
		t.Fatal("expected effects from events")
	}
}

// --- GenerateLightshow (integration with file output) ---

func TestGenerateLightshow_Integration(t *testing.T) {
	// Need template.xsq in working directory — copy it to temp
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	tmpDir := t.TempDir()
	if err := copyFile(filepath.Join(origDir, "template.xsq"), filepath.Join(tmpDir, "template.xsq")); err != nil {
		t.Fatalf("failed to copy template: %v", err)
	}

	if err := os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	bpm := 120.0
	c := &LightshowConverter{
		BPMPerMillisecond: bpm / MillisecondsPerMinute,
		MapData: &MapData{
			Version: "2.0.0",
			Notes: []Note{
				{Time: 1.0, LineIndex: 0, LineLayer: 0, Type: 0},
				{Time: 2.0, LineIndex: 1, LineLayer: 1, Type: 1},
			},
			Events: []Event{
				{Time: 1.0, Type: 1, Value: 2},
				{Time: 3.0, Type: 0, Value: 5},
			},
		},
	}

	if err := c.GenerateLightshow(); err != nil {
		t.Fatalf("GenerateLightshow failed: %v", err)
	}

	outPath := filepath.Join(tmpDir, "LightshowOutput", "lightshow.xsq")
	data, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("output file not found: %v", err)
	}

	content := string(data)
	if !strings.Contains(content, "SEQUENCE_DURATION") == false && !strings.Contains(content, "sequenceDuration") {
		t.Fatal("output missing sequence duration")
	}
	if !strings.Contains(content, "<Effect") {
		t.Fatal("output missing effects")
	}
	if strings.Contains(content, "MEDIA_FILE_PATH") {
		t.Fatal("MEDIA_FILE_PATH placeholder was not replaced")
	}
	if strings.Contains(content, "SEQUENCE_DURATION") {
		t.Fatal("SEQUENCE_DURATION placeholder was not replaced")
	}
}

// --- buildXMLContent ---

func TestBuildXMLContent_ReplacesPlaceholders(t *testing.T) {
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	tmpDir := t.TempDir()
	if err := copyFile(filepath.Join(origDir, "template.xsq"), filepath.Join(tmpDir, "template.xsq")); err != nil {
		t.Fatalf("failed to copy template: %v", err)
	}

	if err := os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	c := &LightshowConverter{
		BPMPerMillisecond: 120.0 / MillisecondsPerMinute,
		MapData:           &MapData{Version: "2.0.0"},
		Effects:           make(map[string][]string),
		LastBlockTime:     10000,
	}

	xml, err := c.buildXMLContent()
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(xml, "MEDIA_FILE_PATH") {
		t.Fatal("MEDIA_FILE_PATH not replaced")
	}
	if strings.Contains(xml, "SEQUENCE_DURATION") {
		t.Fatal("SEQUENCE_DURATION not replaced")
	}

	// Duration should be LastBlockTime/1000 + SequenceBufferTime = 10 + 5 = 15.000
	if !strings.Contains(xml, "15.000") {
		t.Fatalf("expected duration 15.000 in output")
	}
}

// --- validateInputFile ---

func TestValidateInputFile_Exists(t *testing.T) {
	f := filepath.Join(t.TempDir(), "test.dat")
	os.WriteFile(f, []byte("data"), 0644)
	if err := validateInputFile(f); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateInputFile_NotExists(t *testing.T) {
	if err := validateInputFile("/nonexistent/file.dat"); err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}

// --- isValidURL ---

func TestIsValidURL(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"https://example.com/file.zip", true},
		{"http://beatsaver.com/api/download/key/abc", true},
		{"ftp://files.example.com/map.zip", true},
		{"/local/path/file.dat", false},
		{"file.dat", false},
		{"", false},
	}

	for _, tt := range tests {
		got := isValidURL(tt.input)
		if got != tt.want {
			t.Errorf("isValidURL(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

// --- setupDirectories ---

func TestSetupDirectories(t *testing.T) {
	tmpDir := t.TempDir()
	tempDir := filepath.Join(tmpDir, "converter-temp")

	origDir, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(origDir)

	if err := setupDirectories(tempDir); err != nil {
		t.Fatal(err)
	}

	// Check BeatSaberInputLevel was created
	info, err := os.Stat(filepath.Join(tempDir, "BeatSaberInputLevel"))
	if err != nil || !info.IsDir() {
		t.Fatal("BeatSaberInputLevel directory not created")
	}

	// Check LightshowOutput was created
	info, err = os.Stat(filepath.Join(tmpDir, "LightshowOutput"))
	if err != nil || !info.IsDir() {
		t.Fatal("LightshowOutput directory not created")
	}
}

// --- helpers ---

func writeJSON(t *testing.T, fp string, v interface{}) {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(fp, data, 0644); err != nil {
		t.Fatal(err)
	}
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("read %s: %w", src, err)
	}
	return os.WriteFile(dst, data, 0644)
}
