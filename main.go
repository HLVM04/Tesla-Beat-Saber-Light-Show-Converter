package main

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	startTime := time.Now()

	if err := run(); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	duration := time.Since(startTime)
	fmt.Printf("Done in %.3fs!\n", duration.Seconds())
}

func run() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: %s <beatmap_url_or_path>", os.Args[0])
	}

	input := os.Args[1]

	// Setup directories
	tempDir := filepath.Join(os.TempDir(), "tesla-beat-saber-converter")
	if err := setupDirectories(tempDir); err != nil {
		return fmt.Errorf("failed to setup directories: %w", err)
	}

	// Clean up temp directory on exit
	defer func() {
		if err := os.RemoveAll(tempDir); err != nil {
			fmt.Printf("Warning: Failed to clean up temp directory: %v\n", err)
		}
	}()

	var beatmapPath string
	var err error

	if isValidURL(input) {
		beatmapPath, err = downloadBeatmap(input, tempDir)
		if err != nil {
			return fmt.Errorf("failed to download beatmap: %w", err)
		}
	} else {
		if !strings.HasSuffix(input, ".dat") {
			return fmt.Errorf("invalid file type: expected .dat file")
		}
		beatmapPath = input
	}

	if err := translateBeatmap(beatmapPath); err != nil {
		return fmt.Errorf("failed to translate beatmap: %w", err)
	}

	return nil
}

func isValidURL(str string) bool {
	u, err := url.Parse(str)
	return err == nil && u.Scheme != "" && u.Host != ""
}

func setupDirectories(tempDir string) error {
	dirs := []string{
		filepath.Join(tempDir, "BeatSaberInputLevel"),
		"LightshowOutput",
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	return nil
}
