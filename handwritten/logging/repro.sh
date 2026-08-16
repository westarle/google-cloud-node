#!/bin/bash
npm test > test_output.txt 2>&1
cat test_output.txt
if grep -E '\.prettierrc\.js|\.mocharc\.js' test_output.txt; then
  echo "REPRODUCIBLE: Found config files in coverage report."
  rm test_output.txt
  exit 1
else
  echo "NOT REPRODUCIBLE: Config files not found in coverage report."
  rm test_output.txt
  exit 0
fi
