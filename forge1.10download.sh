#!/bin/bash
wget https://files.minecraftforge.net/maven/net/minecraftforge/forge/1.10.2-12.18.3.2185/forge-1.10.2-12.18.3.2185-mdk.zip
unzip forge-1.10.2-12.18.3.2185-mdk.zip
chmod 755 gradlew
./gradlew buildDecompWorkspace
