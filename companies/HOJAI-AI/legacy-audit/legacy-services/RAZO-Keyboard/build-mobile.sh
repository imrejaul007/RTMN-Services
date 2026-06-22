#!/bin/bash
# RAZO Keyboard - Build Mobile Apps
# Usage: ./build-mobile.sh [ios|android|all]

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🎹 RAZO Keyboard - Build Mobile Apps                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

BUILD_TYPE=${1:-all}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")"

build_ios() {
    echo -e "${GREEN}Building iOS...${NC}"
    cd iOS

    if [ ! -f RAZOKeyboard.xcodeproj ]; then
        echo -e "${YELLOW}Generating Xcode project...${NC}"
        xcodegen generate
    fi

    if [ ! -f RAZOKeyboard.xcworkspace ]; then
        echo -e "${YELLOW}Installing CocoaPods...${NC}"
        pod install
    fi

    echo -e "${GREEN}Building RAZOKeyboardApp...${NC}"
    xcodebuild -workspace RAZOKeyboard.xcworkspace \
        -scheme RAZOKeyboardApp \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        build 2>&1 | tail -20

    echo -e "${GREEN}iOS build complete!${NC}"
    cd ..
}

build_android() {
    echo -e "${GREEN}Building Android...${NC}"
    cd Android

    if [ ! -f gradlew ]; then
        echo -e "${YELLOW}Creating gradle wrapper...${NC}"
        gradle wrapper --gradle-version 8.2
    fi

    echo -e "${GREEN}Building debug APK...${NC}"
    ./gradlew assembleDebug 2>&1 | tail -30

    if [ -f app/build/outputs/apk/debug/app-debug.apk ]; then
        echo -e "${GREEN}APK created: app/build/outputs/apk/debug/app-debug.apk${NC}"
    fi

    echo -e "${GREEN}Android build complete!${NC}"
    cd ..
}

case $BUILD_TYPE in
    ios)
        build_ios
        ;;
    android)
        build_android
        ;;
    all)
        build_ios
        echo ""
        build_android
        ;;
    *)
        echo "Usage: $0 [ios|android|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗"
echo "║  Build complete!                                            ║"
echo "╚═══════════════════════════════════════════════════════════╝${NC}"
