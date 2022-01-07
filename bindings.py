RightLights = {
    1: "Right Outer Main Beam",
    2: 'Right Inner Main Beam',
    3: 'Right Signature',
    4: 'Right Channel 4',
    5: 'Right Channel 5',
    6: 'Right Channel 6',
    7: 'Right Front Turn',
    8: 'Right Front Fog',
    9: 'Right Aux Park',
    10: 'Right Side Marker',
}

LeftLights = {
    1: 'Left Outer Main Beam',
    2: 'Left Inner Main Beam',
    3: 'Left Signature',
    4: 'Left Channel 4',
    5: 'Left Channel 5',
    6: 'Left Channel 6',
    7: 'Left Front Turn',
    8: 'Left Front Fog',
    9: 'Left Aux Park',
    10: 'Left Side Marker',
}
RL = RightLights
LL = LeftLights

LightBindingsLeft = {
    '00': [LL[7], LL[8]],
    '01': [LL[7], LL[8], LL[9]],
    '02': [LL[7], LL[10], LL[9]],
    '03': [LL[7], LL[10]],
    '10': [LL[1]],
    '11': [LL[1], LL[3]],
    '12': [LL[2], LL[3]],
    '13': [LL[2]],
    '20': [LL[4]],
    '21': [LL[5]],
    '22': [LL[5]],
    '23': [LL[6]]
}

LightBindingsRight = {
    '00': [RL[7], RL[10]],
    '01': [RL[7], RL[10], RL[9]],
    '02': [RL[7], RL[8], RL[9]],
    '03': [RL[7], RL[8]],
    '10': [RL[2]],
    '11': [RL[2], RL[3]],
    '12': [RL[1], RL[3]],
    '13': [RL[1]],
    '20': [RL[6]],
    '21': [RL[5]],
    '22': [RL[5]],
    '23': [RL[4]]
}