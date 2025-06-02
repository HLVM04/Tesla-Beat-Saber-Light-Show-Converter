package main

var RightLights = map[int]string{
	1:  "Right Outer Main Beam",
	2:  "Right Inner Main Beam",
	3:  "Right Signature",
	4:  "Right Channel 4",
	5:  "Right Channel 5",
	6:  "Right Channel 6",
	7:  "Right Front Turn",
	8:  "Right Front Fog",
	9:  "Right Aux Park",
	10: "Right Side Marker",
}

var LeftLights = map[int]string{
	1:  "Left Outer Main Beam",
	2:  "Left Inner Main Beam",
	3:  "Left Signature",
	4:  "Left Channel 4",
	5:  "Left Channel 5",
	6:  "Left Channel 6",
	7:  "Left Front Turn",
	8:  "Left Front Fog",
	9:  "Left Aux Park",
	10: "Left Side Marker",
}

var RearLights = map[int]string{
	1: "Left Side Repeater",
	2: "Left Rear Turn",
	3: "Left Tail",
	4: "Right Side Repeater",
	5: "Right Rear Turn",
	6: "Right Tail",
	7: "Brake Lights",
	8: "License Plate",
}

var LightBindingsLeft = map[string][]string{
	"00": {LeftLights[7], LeftLights[8]},
	"01": {LeftLights[7], LeftLights[8], LeftLights[9]},
	"02": {LeftLights[7], LeftLights[10], LeftLights[9]},
	"03": {LeftLights[7], LeftLights[10]},
	"10": {LeftLights[1]},
	"11": {LeftLights[1], LeftLights[3]},
	"12": {LeftLights[2], LeftLights[3]},
	"13": {LeftLights[2]},
	"20": {LeftLights[4]},
	"21": {LeftLights[5]},
	"22": {LeftLights[5]},
	"23": {LeftLights[6]},
}

var LightBindingsRight = map[string][]string{
	"00": {RightLights[7], RightLights[10]},
	"01": {RightLights[7], RightLights[10], RightLights[9]},
	"02": {RightLights[7], RightLights[8], RightLights[9]},
	"03": {RightLights[7], RightLights[8]},
	"10": {RightLights[2]},
	"11": {RightLights[2], RightLights[3]},
	"12": {RightLights[1], RightLights[3]},
	"13": {RightLights[1]},
	"20": {RightLights[6]},
	"21": {RightLights[5]},
	"22": {RightLights[5]},
	"23": {RightLights[4]},
}

var LightBindingsRear = map[int][]string{
	0: {RearLights[7]},
	1: {RearLights[3], RearLights[6]},
	2: {RearLights[1], RearLights[4]},
	3: {RearLights[2], RearLights[5]},
	4: {RearLights[8]},
}
