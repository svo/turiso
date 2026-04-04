#!/usr/bin/env bash

image=$1 &&
architecture=$2 &&

if [ -z "$architecture" ]; then
  docker push "svanosselaer/turiso-${image}" --all-tags
else
  docker push "svanosselaer/turiso-${image}:${architecture}"
fi
