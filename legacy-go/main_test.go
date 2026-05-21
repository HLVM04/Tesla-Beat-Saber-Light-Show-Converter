package main

import (
	"os"
	"testing"
)

func TestRun_NoArgs(t *testing.T) {
	origArgs := os.Args
	defer func() { os.Args = origArgs }()

	os.Args = []string{"cmd"}
	err := run()
	if err == nil {
		t.Fatal("expected error with no args")
	}
}

func TestRun_InvalidFileType(t *testing.T) {
	origArgs := os.Args
	defer func() { os.Args = origArgs }()

	os.Args = []string{"cmd", "notaurl.txt"}
	err := run()
	if err == nil {
		t.Fatal("expected error for non-.dat file")
	}
}

func TestRun_NonexistentDatFile(t *testing.T) {
	origArgs := os.Args
	defer func() { os.Args = origArgs }()

	os.Args = []string{"cmd", "/nonexistent/path/map.dat"}
	err := run()
	if err == nil {
		t.Fatal("expected error for nonexistent .dat file")
	}
}
