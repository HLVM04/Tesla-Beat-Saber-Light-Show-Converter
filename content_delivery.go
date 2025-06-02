package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type InfoData struct {
	DifficultyBeatmapSets []struct {
		DifficultyBeatmaps []struct {
			BeatmapFilename string `json:"_beatmapFilename"`
		} `json:"_difficultyBeatmaps"`
	} `json:"_difficultyBeatmapSets"`
}

func clearFolder(folder string) error {
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
		err = os.RemoveAll(filepath.Join(folder, name))
		if err != nil {
			fmt.Printf("Failed to delete %s. Reason: %v\n", filepath.Join(folder, name), err)
		}
	}
	return nil
}

func downloadBeatmap(url string) (string, error) {
	clearFolder("BeatSaberInputLevel")

	fmt.Println("Downloading...")
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	out, err := os.Create("downloadedBeatmap.zip")
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", err
	}

	fmt.Println("Extracting...")
	r, err := zip.OpenReader("downloadedBeatmap.zip")
	if err != nil {
		return "", err
	}
	defer r.Close()

	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			return "", err
		}
		defer rc.Close()

		path := filepath.Join("BeatSaberInputLevel", f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(path, f.FileInfo().Mode())
			continue
		}

		os.MkdirAll(filepath.Dir(path), 0755)
		outFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.FileInfo().Mode())
		if err != nil {
			return "", err
		}
		defer outFile.Close()

		_, err = io.Copy(outFile, rc)
		if err != nil {
			return "", err
		}
	}

	infoFile, err := os.Open("BeatSaberInputLevel/Info.dat")
	if err != nil {
		return "", err
	}
	defer infoFile.Close()

	var infoData InfoData
	if err := json.NewDecoder(infoFile).Decode(&infoData); err != nil {
		return "", err
	}

	beatmaps := infoData.DifficultyBeatmapSets[0].DifficultyBeatmaps
	lastBeatmap := beatmaps[len(beatmaps)-1]

	return "BeatSaberInputLevel/" + lastBeatmap.BeatmapFilename, nil
}
