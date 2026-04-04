#!/usr/bin/env bash

image=$1

docker manifest rm "svanosselaer/turiso-${image}:latest" 2>/dev/null || true

docker manifest create \
  "svanosselaer/turiso-${image}:latest" \
  --amend "svanosselaer/turiso-${image}:amd64" \
  --amend "svanosselaer/turiso-${image}:arm64" &&
docker manifest push "svanosselaer/turiso-${image}:latest"
