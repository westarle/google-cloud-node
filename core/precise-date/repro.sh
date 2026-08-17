#!/bin/bash
cd "$(dirname "$0")"
npx -y -p typescript@latest tsc src/index.ts --noEmit --target es2022 --lib es2022,esnext.bigint --ignoreConfig
