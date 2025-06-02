package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	DownloadTimeout = 60 * time.Second // Increased timeout
	MaxFileSize     = 1000 * 1024 * 1024 // 1GB
	MaxRetries      = 3
	RetryDelay      = 2 * time.Second
)

type InfoData struct {
	DifficultyBeatmapSets []struct {
		DifficultyBeatmaps []struct {
			BeatmapFilename string `json:"_beatmapFilename"`
		} `json:"_difficultyBeatmaps"`
	} `json:"_difficultyBeatmapSets"`
}

func downloadBeatmap(url string, tempDir string) (string, error) {
	beatSaberDir := filepath.Join(tempDir, "BeatSaberInputLevel")
	if err := clearFolder(beatSaberDir); err != nil {
		return "", fmt.Errorf("failed to clear folder: %w", err)
	}

	zipPath, err := downloadFileWithRetry(url, tempDir)
	if err != nil {
		return "", fmt.Errorf("download failed: %w", err)
	}
	defer os.Remove(zipPath)

	fmt.Println("Extracting...")
	if err := extractZip(zipPath, beatSaberDir); err != nil {
		return "", fmt.Errorf("extraction failed: %w", err)
	}

	return findBeatmapFile(beatSaberDir)
}

func downloadFileWithRetry(url, tempDir string) (string, error) {
	var lastErr error
	
	fmt.Println("Downloading BeatMap...")

	for attempt := 1; attempt <= MaxRetries; attempt++ {
		if attempt > 1 {
			fmt.Printf("Retrying download (attempt %d/%d)...\n", attempt, MaxRetries)
			time.Sleep(RetryDelay)
		}
		
		zipPath, err := downloadFile(url, tempDir)
		if err == nil {
			return zipPath, nil
		}
		
		lastErr = err
		
		// Clean up partial file
		if zipPath != "" {
			os.Remove(zipPath)
		}
	}
	
	return "", fmt.Errorf("download failed after %d attempts: %w", MaxRetries, lastErr)
}

func downloadFile(url, tempDir string) (string, error) {
	// Create HTTP client with better configuration
	client := &http.Client{
		Timeout: DownloadTimeout,
		Transport: &http.Transport{
			DisableKeepAlives:     false,
			DisableCompression:    false,
			MaxIdleConns:          10,
			MaxIdleConnsPerHost:   10,
			IdleConnTimeout:       30 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
		},
	}

	// Create request with proper headers
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	
	// Add headers that some servers expect
	req.Header.Set("User-Agent", "Tesla-Beat-Saber-Converter/1.0")
	req.Header.Set("Accept", "application/octet-stream,*/*")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP error: %s (status code: %d)", resp.Status, resp.StatusCode)
	}

	// Check content length if available
	if resp.ContentLength > 0 && resp.ContentLength > MaxFileSize {
		return "", fmt.Errorf("file too large: %d bytes (max: %d)", resp.ContentLength, MaxFileSize)
	}

	zipPath := filepath.Join(tempDir, "downloadedBeatmap.zip")
	out, err := os.Create(zipPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	// Use LimitReader to prevent downloads that are too large
	limitedReader := io.LimitReader(resp.Body, MaxFileSize+1)
	
	written, err := io.Copy(out, limitedReader)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}
	
	if written > MaxFileSize {
		return "", fmt.Errorf("file too large: %d bytes (max: %d)", written, MaxFileSize)
	}
	
	if written == 0 {
		return "", fmt.Errorf("downloaded file is empty")
	}
	
	// Verify the file was written correctly
	if err := out.Sync(); err != nil {
		return "", fmt.Errorf("failed to sync file: %w", err)
	}
	
	return zipPath, nil
}

func extractZip(src, dest string) error {
	// Verify the zip file exists and has content
	info, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("zip file not found: %w", err)
	}
	
	if info.Size() == 0 {
		return fmt.Errorf("zip file is empty")
	}

	r, err := zip.OpenReader(src)
	if err != nil {
		return fmt.Errorf("failed to open zip file: %w", err)
	}
	defer r.Close()

	if len(r.File) == 0 {
		return fmt.Errorf("zip file contains no files")
	}

	for _, f := range r.File {
		if err := extractFile(f, dest); err != nil {
			return fmt.Errorf("failed to extract %s: %w", f.Name, err)
		}
	}
	return nil
}

func extractFile(f *zip.File, destDir string) error {
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	path := filepath.Join(destDir, f.Name)

	// Security check: prevent zip slip
	if !filepath.HasPrefix(path, filepath.Clean(destDir)+string(os.PathSeparator)) {
		return fmt.Errorf("invalid file path: %s", f.Name)
	}

	if f.FileInfo().IsDir() {
		return os.MkdirAll(path, f.FileInfo().Mode())
	}

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.FileInfo().Mode())
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, rc)
	return err
}

func findBeatmapFile(beatSaberDir string) (string, error) {
	infoFile, err := os.Open(filepath.Join(beatSaberDir, "Info.dat"))
	if err != nil {
		return "", fmt.Errorf("file Info.dat not found: %w", err)
	}
	defer infoFile.Close()

	var infoData InfoData
	if err := json.NewDecoder(infoFile).Decode(&infoData); err != nil {
		return "", fmt.Errorf("failed to parse Info.dat: %w", err)
	}

	if len(infoData.DifficultyBeatmapSets) == 0 || len(infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps) == 0 {
		return "", fmt.Errorf("no difficulty beatmaps found")
	}

	beatmaps := infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps
	lastBeatmap := beatmaps[len(beatmaps)-1]
	beatmapPath := filepath.Join(beatSaberDir, lastBeatmap.BeatmapFilename)

	if _, err := os.Stat(beatmapPath); err != nil {
		return "", fmt.Errorf("beatmap file not found: %s", lastBeatmap.BeatmapFilename)
	}

	return beatmapPath, nil
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
