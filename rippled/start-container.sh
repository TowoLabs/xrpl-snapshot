#!/bin/bash

docker run \
    --rm \
    --name rippledvalidator \
    -p 51235:51235 \
    -p 6006:6006 \
    --entrypoint /opt/ripple/bin/rippled \
    -v "$(pwd)/conf"/:/keystore/ \
    xrptipbot/rippledvalidator:latest \
    -a --start --conf=/keystore/rippled.cfg &
