package main

import (
	"fmt"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

func main() {
	startTime := time.Now()

	// Create temp directory for this session
	tempDir := filepath.Join(os.TempDir(), "tesla-beat-saber-converter")
	os.MkdirAll(filepath.Join(tempDir, "BeatSaberInputLevel"), 0755)
	os.MkdirAll("LightshowOutput", 0755)

	// Clean up temp directory on exit
	defer func() {
		if _, err := os.Stat(tempDir); err == nil {
			os.RemoveAll(tempDir)
		}
	}()

	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <beatmap_url_or_path>")
		os.Exit(1)
	}

	input := os.Args[1]

	// Check if input is a valid URL
	if _, err := url.ParseRequestURI(input); err == nil {
		difficultyMapPath, err := downloadBeatmap(input, tempDir)
		if err != nil {
			fmt.Printf("Error downloading beatmap: %v\n", err)
			os.Exit(1)
		}

		if err := translateBeatmap(difficultyMapPath); err != nil {
			fmt.Printf("Error translating beatmap: %v\n", err)
			os.Exit(1)
		}
	} else {
		if err := translateBeatmap(input); err != nil {
			fmt.Printf("Error translating beatmap: %v\n", err)
			os.Exit(1)
		}
	}

	duration := time.Since(startTime)
	fmt.Printf("Done in %vs!\n", math.Floor(duration.Seconds()*1000)/1000)
}
