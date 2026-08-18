#!/bin/bash
set -e
git checkout -- packages/google-cloud-workloadidentity/.repo-metadata.json
PATH=$PATH:/usr/local/google/home/westarle/.npm-global/bin librarian generate --all
git diff --exit-code packages/google-cloud-workloadidentity/.repo-metadata.json
