#!/usr/bin/env bash
showargs() {
  echo "argc=0"
  for i in ""; do
    echo "  arg=[]"
  done
}
PORT=12345
showargs "POST test" "000" "400"
