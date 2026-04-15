package main

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestExtractZip(t *testing.T) {
	dir := t.TempDir()

	// Create a test zip file
	zipPath := filepath.Join(dir, "test.zip")
	createTestZip(t, zipPath, map[string]string{
		"file1.txt": "hello",
		"file2.txt": "world",
	})

	dest := filepath.Join(dir, "extracted")
	os.MkdirAll(dest, 0755)

	if err := extractZip(zipPath, dest); err != nil {
		t.Fatalf("extractZip failed: %v", err)
	}

	// Verify extracted files
	for _, name := range []string{"file1.txt", "file2.txt"} {
		if _, err := os.Stat(filepath.Join(dest, name)); err != nil {
			t.Fatalf("expected file %s not found: %v", name, err)
		}
	}
}

func TestExtractZip_EmptyZip(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "empty.zip")
	createTestZip(t, zipPath, map[string]string{})

	dest := filepath.Join(dir, "extracted")
	os.MkdirAll(dest, 0755)

	err := extractZip(zipPath, dest)
	if err == nil {
		t.Fatal("expected error for empty zip")
	}
}

func TestExtractZip_InvalidFile(t *testing.T) {
	dir := t.TempDir()
	fp := filepath.Join(dir, "bad.zip")
	os.WriteFile(fp, []byte("not a zip"), 0644)

	err := extractZip(fp, dir)
	if err == nil {
		t.Fatal("expected error for invalid zip")
	}
}

func TestFindBeatmapFile(t *testing.T) {
	dir := t.TempDir()

	info := InfoData{
		DifficultyBeatmapSets: []struct {
			DifficultyBeatmaps []struct {
				BeatmapFilename string `json:"_beatmapFilename"`
			} `json:"_difficultyBeatmaps"`
		}{
			{
				DifficultyBeatmaps: []struct {
					BeatmapFilename string `json:"_beatmapFilename"`
				}{
					{BeatmapFilename: "Easy.dat"},
					{BeatmapFilename: "ExpertPlus.dat"},
				},
			},
		},
	}

	// Write Info.dat
	data, _ := json.Marshal(info)
	os.WriteFile(filepath.Join(dir, "Info.dat"), data, 0644)

	// Create the beatmap file (last difficulty)
	os.WriteFile(filepath.Join(dir, "ExpertPlus.dat"), []byte("{}"), 0644)

	result, err := findBeatmapFile(dir)
	if err != nil {
		t.Fatalf("findBeatmapFile failed: %v", err)
	}
	if filepath.Base(result) != "ExpertPlus.dat" {
		t.Fatalf("expected ExpertPlus.dat, got %s", filepath.Base(result))
	}
}

func TestFindBeatmapFile_NoDifficulties(t *testing.T) {
	dir := t.TempDir()
	info := InfoData{}
	data, _ := json.Marshal(info)
	os.WriteFile(filepath.Join(dir, "Info.dat"), data, 0644)

	_, err := findBeatmapFile(dir)
	if err == nil {
		t.Fatal("expected error for no difficulties")
	}
}

func TestFindBeatmapFile_MissingInfoDat(t *testing.T) {
	dir := t.TempDir()
	_, err := findBeatmapFile(dir)
	if err == nil {
		t.Fatal("expected error for missing Info.dat")
	}
}

func TestClearFolder(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "toclean")
	os.MkdirAll(target, 0755)
	os.WriteFile(filepath.Join(target, "a.txt"), []byte("a"), 0644)
	os.WriteFile(filepath.Join(target, "b.txt"), []byte("b"), 0644)

	if err := clearFolder(target); err != nil {
		t.Fatal(err)
	}

	entries, _ := os.ReadDir(target)
	if len(entries) != 0 {
		t.Fatalf("expected empty folder, got %d entries", len(entries))
	}
}

func TestClearFolder_CreatesIfMissing(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "newdir")

	if err := clearFolder(target); err != nil {
		t.Fatal(err)
	}

	info, err := os.Stat(target)
	if err != nil || !info.IsDir() {
		t.Fatal("expected directory to be created")
	}
}

// --- helpers ---

func createTestZip(t *testing.T, zipPath string, files map[string]string) {
	t.Helper()
	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	for name, content := range files {
		fw, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		fw.Write([]byte(content))
	}
	w.Close()
}
