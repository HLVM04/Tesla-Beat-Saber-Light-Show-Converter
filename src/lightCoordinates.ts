// Programmatically parsed and normalized coordinate mapping from xLights custom model definitions.
// Every light is perfectly mapped to the CAD OBJ model vertex coordinate space.

export interface Coordinate3D {
  x: number;
  y: number;
  z: number;
}

export interface LightMetadata {
  glowColorType: "white" | "ice-blue" | "blue-signature" | "amber" | "red" | "underglow-left" | "underglow-right";
  shape: "sphere" | "box";
  // World space dimensions (will be dynamically scaled relative to the loaded car's scale)
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
}

export const LIGHT_METADATA: Record<string, LightMetadata> = {
  "Left Outer Main Beam": { glowColorType: "ice-blue", shape: "sphere", radius: 0.05 },
  "Right Outer Main Beam": { glowColorType: "ice-blue", shape: "sphere", radius: 0.05 },
  "Left Inner Main Beam": { glowColorType: "ice-blue", shape: "sphere", radius: 0.05 },
  "Right Inner Main Beam": { glowColorType: "ice-blue", shape: "sphere", radius: 0.05 },
  "Left Signature": { glowColorType: "blue-signature", shape: "box", width: 0.02, height: 0.02, depth: 0.25 },
  "Right Signature": { glowColorType: "blue-signature", shape: "box", width: 0.02, height: 0.02, depth: 0.25 },
  
  "Left Channel 4": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },
  "Right Channel 4": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },
  "Left Channel 5": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },
  "Right Channel 5": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },
  "Left Channel 6": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },
  "Right Channel 6": { glowColorType: "blue-signature", shape: "sphere", radius: 0.04 },

  "Left Front Turn": { glowColorType: "amber", shape: "sphere", radius: 0.04 },
  "Right Front Turn": { glowColorType: "amber", shape: "sphere", radius: 0.04 },
  "Left Front Fog": { glowColorType: "white", shape: "sphere", radius: 0.04 },
  "Right Front Fog": { glowColorType: "white", shape: "sphere", radius: 0.04 },
  "Left Aux Park": { glowColorType: "white", shape: "sphere", radius: 0.035 },
  "Right Aux Park": { glowColorType: "white", shape: "sphere", radius: 0.035 },
  "Left Side Marker": { glowColorType: "amber", shape: "sphere", radius: 0.025 },
  "Right Side Marker": { glowColorType: "amber", shape: "sphere", radius: 0.025 },
  
  "Left Side Repeater": { glowColorType: "amber", shape: "box", width: 0.08, height: 0.04, depth: 0.02 },
  "Right Side Repeater": { glowColorType: "amber", shape: "box", width: 0.08, height: 0.04, depth: 0.02 },
  
  "Left Rear Turn": { glowColorType: "amber", shape: "sphere", radius: 0.04 },
  "Right Rear Turn": { glowColorType: "amber", shape: "sphere", radius: 0.04 },
  
  "Brake Lights": { glowColorType: "red", shape: "box", width: 0.02, height: 0.03, depth: 0.18 },
  "Left Tail": { glowColorType: "red", shape: "box", width: 0.03, height: 0.05, depth: 0.22 },
  "Right Tail": { glowColorType: "red", shape: "box", width: 0.03, height: 0.05, depth: 0.22 },
  
  "Reverse Lights": { glowColorType: "white", shape: "sphere", radius: 0.035 },
  "Rear Fog Lights": { glowColorType: "red", shape: "sphere", radius: 0.035 },
  "License Plate": { glowColorType: "white", shape: "sphere", radius: 0.025 },

  // Cabin Indicators (Doors, windows, closures, handles)
  "Left Falcon Door": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Right Falcon Door": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Left Front Door": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Right Front Door": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Left Mirror": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Right Mirror": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Left Front Window": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Left Rear Window": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Right Front Window": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Right Rear Window": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Liftgate": { glowColorType: "white", shape: "sphere", radius: 0.03 },
  "Left Front Door Handle": { glowColorType: "white", shape: "sphere", radius: 0.025 },
  "Left Rear Door Handle": { glowColorType: "white", shape: "sphere", radius: 0.025 },
  "Right Front Door Handle": { glowColorType: "white", shape: "sphere", radius: 0.025 },
  "Rear Rear Door Handle": { glowColorType: "white", shape: "sphere", radius: 0.025 },
  "Charge Port": { glowColorType: "white", shape: "sphere", radius: 0.03 }
};

export const MODEL_S_COORDINATES: Record<string, Coordinate3D[]> = {
  "Left Outer Main Beam": [
    {
      "x": 429.7761,
      "y": 130.7631,
      "z": -147.725
    }
  ],
  "Right Outer Main Beam": [
    {
      "x": 429.7761,
      "y": 130.7631,
      "z": 142.1949
    }
  ],
  "Left Inner Main Beam": [
    {
      "x": 439.3687,
      "y": 127.2878,
      "z": -128.9801
    }
  ],
  "Right Inner Main Beam": [
    {
      "x": 439.3687,
      "y": 127.2878,
      "z": 125.4707
    }
  ],
  "Left Signature": [
    {
      "x": 412.7541,
      "y": 148.0317,
      "z": -159.6075
    }
  ],
  "Right Signature": [
    {
      "x": 412.7541,
      "y": 148.0317,
      "z": 159.3586
    }
  ],
  "Left Channel 4": [
    {
      "x": 422.0039,
      "y": 144.8613,
      "z": -148.2675
    }
  ],
  "Right Channel 4": [
    {
      "x": 422.0039,
      "y": 144.8613,
      "z": 145.8786
    }
  ],
  "Left Channel 5": [
    {
      "x": 432.0859,
      "y": 138.5538,
      "z": -131.5254
    }
  ],
  "Right Channel 5": [
    {
      "x": 432.0859,
      "y": 138.5538,
      "z": 133.5965
    }
  ],
  "Left Channel 6": [
    {
      "x": 446.186,
      "y": 136.134,
      "z": -114.123
    }
  ],
  "Right Channel 6": [
    {
      "x": 446.186,
      "y": 136.134,
      "z": 116.682
    }
  ],
  "Left Front Turn": [
    {
      "x": 412.4765,
      "y": 136.2632,
      "z": -168.8582
    }
  ],
  "Right Front Turn": [
    {
      "x": 412.4765,
      "y": 136.2632,
      "z": 166.5891
    }
  ],
  "Left Front Fog": [
    {
      "x": 428.455,
      "y": 80.3043,
      "z": -167.7433
    }
  ],
  "Right Front Fog": [
    {
      "x": 428.455,
      "y": 80.3043,
      "z": 166.3783
    }
  ],
  "Left Aux Park": [
    {
      "x": 446.6463,
      "y": 80.3043,
      "z": -153.104
    }
  ],
  "Right Aux Park": [
    {
      "x": 446.6463,
      "y": 80.3043,
      "z": 152.8278
    }
  ],
  "Left Side Marker": [
    {
      "x": 458.4517,
      "y": 75.2767,
      "z": -136.6436
    }
  ],
  "Right Side Marker": [
    {
      "x": 458.4517,
      "y": 75.2767,
      "z": 135.8208
    }
  ],
  "Left Side Repeater": [
    {
      "x": 234.7204,
      "y": 147.7412,
      "z": -197.5376
    }
  ],
  "Right Side Repeater": [
    {
      "x": 234.7204,
      "y": 147.7412,
      "z": 197.54
    }
  ],
  "Left Rear Turn": [
    {
      "x": -445.7089,
      "y": 166.7941,
      "z": -159.0402
    }
  ],
  "Right Rear Turn": [
    {
      "x": -445.7089,
      "y": 166.7941,
      "z": 146.091
    }
  ],
  "Brake Lights": [
    {
      "x": -275.0425,
      "y": 268.3756,
      "z": -75.7947
    }
  ],
  "Left Tail": [
    {
      "x": -439.6642,
      "y": 160.5505,
      "z": -145.2213
    }
  ],
  "Right Tail": [
    {
      "x": -446.4688,
      "y": 160.5505,
      "z": 134.6245
    }
  ],
  "Reverse Lights": [
    {
      "x": -455.0493,
      "y": 172.7186,
      "z": -107.3238
    }
  ],
  "Rear Fog Lights": [
    {
      "x": -455.0493,
      "y": 167.4651,
      "z": -98.5213
    }
  ],
  "License Plate": [
    {
      "x": -469.9217,
      "y": 158.2614,
      "z": -27.8054
    }
  ],
  "Left Falcon Door": [
    {
      "x": -124.8472,
      "y": 144.0555,
      "z": -194.0938
    }
  ],
  "Right Falcon Door": [
    {
      "x": -124.8472,
      "y": 144.0555,
      "z": 193.7541
    }
  ],
  "Left Front Door": [
    {
      "x": 56.5959,
      "y": 130.5915,
      "z": -191.0557
    }
  ],
  "Right Front Door": [
    {
      "x": 56.5959,
      "y": 130.5915,
      "z": 193.1448
    }
  ],
  "Left Mirror": [
    {
      "x": 111.5359,
      "y": 214.2421,
      "z": -191.0557
    }
  ],
  "Right Mirror": [
    {
      "x": 111.5359,
      "y": 214.2421,
      "z": 196.574
    }
  ],
  "Left Front Window": [
    {
      "x": 20.0871,
      "y": 227.801,
      "z": -159.3158
    }
  ],
  "Left Rear Window": [
    {
      "x": -143.5363,
      "y": 227.801,
      "z": -154.7227
    }
  ],
  "Right Front Window": [
    {
      "x": 20.0871,
      "y": 227.801,
      "z": 159.8806
    }
  ],
  "Right Rear Window": [
    {
      "x": -143.54,
      "y": 227.8,
      "z": 153.85
    }
  ],
  "Liftgate": [
    {
      "x": -275.2434,
      "y": 268.5485,
      "z": 0.5661
    }
  ],
  "Left Front Door Handle": [
    {
      "x": -9.0223,
      "y": 167.1135,
      "z": -184.8703
    }
  ],
  "Left Rear Door Handle": [
    {
      "x": -213.2558,
      "y": 183.8885,
      "z": -183.102
    }
  ],
  "Right Front Door Handle": [
    {
      "x": -9.0223,
      "y": 167.1135,
      "z": 184.1639
    }
  ],
  "Rear Rear Door Handle": [
    {
      "x": -213.26,
      "y": 183.89,
      "z": 184
    }
  ],
  "Charge Port": [
    {
      "x": -404.491,
      "y": 166.5411,
      "z": -177.7444
    }
  ]
};

export const CYBERTRUCK_COORDINATES: Record<string, Coordinate3D[]> = {
  "Left Outer Main Beam": [
    {
      "x": 269.9817,
      "y": 65.935,
      "z": -56
    }
  ],
  "Right Outer Main Beam": [
    {
      "x": 269.98,
      "y": 65.935,
      "z": 56
    }
  ],
  "Left Inner Main Beam": [
    {
      "x": 271.7097,
      "y": 65.93565,
      "z": -45
    }
  ],
  "Right Inner Main Beam": [
    {
      "x": 271.71,
      "y": 65.935,
      "z": 45
    }
  ],
  "Left Signature": [],
  "Right Signature": [],
  "Left Channel 4": [
    {
      "x": 239.69821519999996,
      "y": 0,
      "z": -93.64263157894737
    }
  ],
  "Right Channel 4": [
    {
      "x": 239.69821519999996,
      "y": 0,
      "z": 92.13385263157895
    }
  ],
  "Left Channel 5": [
    {
      "x": 245.42479119999996,
      "y": 0,
      "z": -83.06867368421051
    }
  ],
  "Right Channel 5": [
    {
      "x": 245.42479119999996,
      "y": 0,
      "z": 84.37673684210526
    }
  ],
  "Left Channel 6": [
    {
      "x": 253.43364799999998,
      "y": 0,
      "z": -72.07768421052631
    }
  ],
  "Right Channel 6": [
    {
      "x": 253.43364799999998,
      "y": 0,
      "z": 73.6938947368421
    }
  ],
  "Left Front Turn": [
    {
      "x": 263.725,
      "y": 65.935,
      "z": -75
    }
  ],
  "Right Front Turn": [
    {
      "x": 263.72545,
      "y": 65.935,
      "z": 75
    }
  ],
  "Left Front Fog": [],
  "Right Front Fog": [],
  "Left Aux Park": [
    {
      "x": 281.6667,
      "y": 83.32965,
      "z": 0
    }
  ],
  "Right Aux Park": [],
  "Left Side Marker": [
    {
      "x": 249.7089,
      "y": 65.935,
      "z": -90
    }
  ],
  "Right Side Marker": [
    {
      "x": 249.71,
      "y": 65.935,
      "z": 90
    }
  ],
  "Left Side Repeater": [
    {
      "x": -265.6323,
      "y": 68.01,
      "z": -87.5
    }
  ],
  "Right Side Repeater": [
    {
      "x": -265.63,
      "y": 68.01,
      "z": 87.5
    }
  ],
  "Left Rear Turn": [
    {
      "x": -279.98,
      "y": 126.335,
      "z": -85
    }
  ],
  "Right Rear Turn": [
    {
      "x": -279.98,
      "y": 126.335,
      "z": 85
    }
  ],
  "Brake Lights": [
    {
      "x": -279.9817,
      "y": 126.3326,
      "z": 0
    }
  ],
  "Left Tail": [
    {
      "x": -271.02,
      "y": 64.33545,
      "z": -22
    }
  ],
  "Right Tail": [
    {
      "x": -271.02,
      "y": 64.335,
      "z": 22
    }
  ],
  "Reverse Lights": [
    {
      "x": -199.15525,
      "y": 149.13225,
      "z": -75
    },
    {
      "x": -199.155,
      "y": 149.13,
      "z": 75
    }
  ],
  "Rear Fog Lights": [],
  "License Plate": [
    {
      "x": -271.01915,
      "y": 68.0107,
      "z": 0
    }
  ],
  "Left Falcon Door": [],
  "Right Falcon Door": [],
  "Left Front Door": [],
  "Right Front Door": [],
  "Left Mirror": [
    {
      "x": 110.735,
      "y": 140.305,
      "z": -110
    }
  ],
  "Right Mirror": [
    {
      "x": 110.733,
      "y": 140.30665,
      "z": 110.00155000000001
    }
  ],
  "Left Front Window": [
    {
      "x": 70.46245,
      "y": 147.7954,
      "z": -85
    }
  ],
  "Left Rear Window": [
    {
      "x": -30.0619,
      "y": 147.795,
      "z": -85
    }
  ],
  "Right Front Window": [
    {
      "x": 70.46,
      "y": 147.795,
      "z": 85
    }
  ],
  "Right Rear Window": [
    {
      "x": -30.06,
      "y": 147.795,
      "z": 85
    }
  ],
  "Liftgate": [
    {
      "x": 245.94175,
      "y": 117.12085,
      "z": 0
    }
  ],
  "Left Front Door Handle": [],
  "Left Rear Door Handle": [],
  "Right Front Door Handle": [],
  "Rear Rear Door Handle": [],
  "Charge Port": [
    {
      "x": -203.1558,
      "y": 99.52585,
      "z": -98.14224999999999
    }
  ]
};
