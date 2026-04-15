package main

import "testing"

func TestLightBindingMaps_Complete(t *testing.T) {
	// Verify all left binding keys exist in right bindings and vice versa
	for key := range LightBindingsLeft {
		if _, exists := LightBindingsRight[key]; !exists {
			t.Errorf("LightBindingsRight missing key %q that exists in LightBindingsLeft", key)
		}
	}
	for key := range LightBindingsRight {
		if _, exists := LightBindingsLeft[key]; !exists {
			t.Errorf("LightBindingsLeft missing key %q that exists in LightBindingsRight", key)
		}
	}
}

func TestLightBindingMaps_NonEmpty(t *testing.T) {
	for key, val := range LightBindingsLeft {
		if len(val) == 0 {
			t.Errorf("LightBindingsLeft[%q] is empty", key)
		}
	}
	for key, val := range LightBindingsRight {
		if len(val) == 0 {
			t.Errorf("LightBindingsRight[%q] is empty", key)
		}
	}
	for key, val := range LightBindingsRear {
		if len(val) == 0 {
			t.Errorf("LightBindingsRear[%d] is empty", key)
		}
	}
}

func TestRearLightsBindings_Coverage(t *testing.T) {
	// Ensure rear bindings cover indices 0-4
	for i := 0; i <= 4; i++ {
		if _, exists := LightBindingsRear[i]; !exists {
			t.Errorf("LightBindingsRear missing index %d", i)
		}
	}
}

func TestLeftRightLights_HaveExpectedKeys(t *testing.T) {
	expectedKeys := []string{"00", "01", "02", "03", "10", "11", "12", "13", "20", "21", "22", "23"}
	for _, key := range expectedKeys {
		if _, exists := LightBindingsLeft[key]; !exists {
			t.Errorf("LightBindingsLeft missing expected key %q", key)
		}
		if _, exists := LightBindingsRight[key]; !exists {
			t.Errorf("LightBindingsRight missing expected key %q", key)
		}
	}
}
