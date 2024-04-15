#!/bin/bash
node --max-old-space-size=6144 src/indexes.js && node --max-old-space-size=6144 src/main.js