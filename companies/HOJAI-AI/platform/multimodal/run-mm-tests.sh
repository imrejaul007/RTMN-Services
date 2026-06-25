#!/bin/bash
set -e
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/multimodal
LOG=/tmp/mm-tests-$(date +%s).log

run_test() {
  local svc=$1
  local port=$2
  echo "=== Testing $svc (port $port) ===" | tee -a $LOG
  cd $svc
  PORT=$port node --test --test-force-exit --test-concurrency=1 test/test.js >> $LOG 2>&1
  local rc=$?
  echo "Exit code: $rc" | tee -a $LOG
  cd ..
}

run_test mm-image-understanding 19371
run_test mm-audio-transcription 19370
run_test mm-ocr 19372
run_test mm-visual-generator 19373
run_test mm-video-analysis 19353
run_test mm-embedder 19347

echo "=== ALL DONE ===" | tee -a $LOG
grep -E "^(ok|not ok|===)" $LOG | head -100
