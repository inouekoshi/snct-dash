with open('lib/game/spawner.ts', 'r') as f:
    lines = f.readlines()

# delete lines 304-326 (index 303 to 325)
del lines[303:326]

with open('lib/game/spawner.ts', 'w') as f:
    f.writelines(lines)
